import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { activitySchema,studentDocument,gradeItem,studentBTurn } from '../_shared/activity-domain.ts';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const token=req.headers.get('Authorization');if(!token)return json({error:'UNAUTHORIZED'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}}});
  const {data:{user},error}=await client.auth.getUser();if(error||!user)return json({error:'UNAUTHORIZED'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try{
    const raw=await req.text();if(raw.length>20000)return json({error:'REQUEST_TOO_LARGE'},413);
    const body=JSON.parse(raw);
    if(body.action==='list'){
      let query=admin.from('activity_versions').select('id,activity_id,version,document').eq('status','published').not('approved_at','is',null).order('published_at',{ascending:false}).limit(100);
      if(typeof body.language==='string')query=query.eq('document->metadata->>language',body.language);
      const {data,error}=await query;if(error)return json({error:'UNAVAILABLE'},503);
      return json({activities:(data??[]).map(v=>({id:v.id,activityId:v.activity_id,version:v.version,metadata:v.document.metadata}))});
    }
    const {data:v,error:readError}=await admin.from('activity_versions').select('*').eq('id',body.versionId).eq('status','published').not('approved_at','is',null).maybeSingle();
    if(readError||!v)return json({error:'ACTIVITY_NOT_AVAILABLE'},404);
    const {data:key}=await admin.from('activity_answer_keys').select('answer_key').eq('version_id',v.id).single();
    const doc=activitySchema.parse({...v.document,answerKey:key?.answer_key});
    if(body.action==='load')return json({id:v.id,version:v.version,activity:studentDocument(doc)});
    if(body.action==='answer')return json(gradeItem(doc,body.itemId,body.answer));
    if(body.action==='student_b')return json(studentBTurn(doc,body.itemId,body.questionId));
    return json({error:'INVALID_ACTION'},400);
  }catch{return json({error:'INVALID_REQUEST'},400);}
});
