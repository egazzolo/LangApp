/// <reference types="node" />
import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { activitySchema,blueprintFor,validateActivity,studentDocument,gradeItem,studentBTurn } from '../src/domain/activities';
import { exampleActivity } from '../src/domain/activity-example';
function endpoint(kind:'activity-admin'|'activity-player',options:{admin?:boolean;authenticated?:boolean;status?:string;invalidKey?:boolean}={}){
  const document=exampleActivity();
  const {answerKey,...publicFields}=document;
  if(options.invalidKey)answerKey[0]!.accepted=['invalid'];
  const version={id:'version',activity_id:'activity',source_id:'source',revision:3,status:options.status??'published',approved_at:options.status==='needs_review'?null:'2026-09-08',document:publicFields};
  const writes:Record<string,unknown>[]=[];
  const builder=(table:string)=>{
    const filters:Record<string,unknown>={};
    const q:Record<string,unknown>={};
    for(const method of ['select','order','limit'])q[method]=()=>q;
    q.eq=(key:string,value:unknown)=>{filters[key]=value;return q;};
    q.not=(key:string)=>{filters[key]='not-null';return q;};
    const result=()=>{
      if(table==='activity_versions'){
        if(filters.status&&filters.status!==version.status)return {data:null,error:null};
        return {data:version,error:null};
      }
      if(table==='teaching_activities')return {data:{locked_blueprint:null},error:null};
      if(table==='activity_answer_keys')return {data:{answer_key:answerKey},error:null};
      if(table==='activity_sources')return {data:{filename:'source.txt',storage_path:'source'},error:null};
      return {data:null,error:null};
    };
    q.single=q.maybeSingle=async()=>result();return q;
  };
  const client={auth:{getUser:async()=>({data:{user:options.authenticated===false?null:{id:'verified-user'}},error:null})},
    rpc:async(name:string,payload:Record<string,unknown>)=>{if(name==='is_activity_admin')return {data:options.admin??true,error:null};writes.push(payload);return {data:'version',error:null};},
    from:builder};
  let handler:(r:Request)=>Promise<Response>;
  const source=readFileSync('supabase/functions/'+kind+'/index.ts','utf8').replace(/^import .*;$/gm,'');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  vm.runInNewContext(code,{Response,JSON,Date,Set,Promise,Error,Uint8Array,activitySchema,blueprintFor,validateActivity,studentDocument,gradeItem,studentBTurn,
    createClient:()=>client,Deno:{env:{get:()=> 'unused'},serve:(h:typeof handler)=>{handler=h;}},console:{error:()=>undefined}});
  return {writes,call:(body:unknown)=>handler!(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer verified-user-token'},body:JSON.stringify(body)}))};
}
describe('Activity endpoints',()=>{
  it('denies learner accounts before performing any admin action',async()=>{
    const e=endpoint('activity-admin',{admin:false});
    expect((await e.call({action:'approve',versionId:'version',humanReviewed:true})).status).toBe(403);expect(e.writes).toEqual([]);
  });
  it('uses verified actor identity, not a body-supplied administrator ID',async()=>{
    const e=endpoint('activity-admin',{status:'needs_review'});
    expect((await e.call({action:'approve',versionId:'version',revision:3,humanReviewed:true,actor:'forged-admin'})).status).toBe(200);
    expect(e.writes[0]?.p_actor).toBe('verified-user');
  });
  it('revalidates database answers instead of trusting a caller report',async()=>{
    const e=endpoint('activity-admin',{status:'needs_review',invalidKey:true});
    expect((await e.call({action:'approve',versionId:'version',revision:3,humanReviewed:true,validation:{errors:[]}})).status).toBe(422);
    expect(e.writes).toEqual([]);
  });
  it('does not expose internal conversion-completion actions to callers',async()=>{
    const e=endpoint('activity-admin');
    expect((await e.call({action:'finish_convert',versionId:'version',revision:3,document:exampleActivity()})).status).toBe(400);
    expect(e.writes).toEqual([]);
  });
  it.each(['uploaded','converting','converted_draft','needs_review','approved','rejected','retired'])('does not serve %s versions to learners',async status=>{
    const e=endpoint('activity-player',{status});
    expect((await e.call({action:'load',versionId:'version'})).status).toBe(404);
  });
  it('serves only the safe published projection',async()=>{
    const e=endpoint('activity-player');const response=await e.call({action:'load',versionId:'version'});
    expect(response.status).toBe(200);const serialized=JSON.stringify(await response.json());
    expect(serialized).not.toContain('answerKey');expect(serialized).not.toContain('teacherNotes');expect(serialized).not.toContain('9 a.m.');
  });
  it('returns grading and scripted Student B turns without a generation call',async()=>{
    const e=endpoint('activity-player');
    expect(await (await e.call({action:'answer',versionId:'version',itemId:'choose',answer:'a'})).json()).toEqual({correct:true});
    expect(await (await e.call({action:'student_b',versionId:'version',itemId:'gap',questionId:'ask_time'})).json()).toEqual({speaker:'Ferson',text:'9 a.m.'});
    expect(e.writes).toEqual([]);
  });
});
