import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { activitySchema,blueprintFor,validateActivity } from '../_shared/activity-domain.ts';
import { checkSource } from '../_shared/activity-files.ts';
import { convertActivity } from '../_shared/activity-conversion.ts';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const safeErrors=new Set(['ADMIN_REQUIRED','INVALID_SOURCE','INVALID_FILE_SIGNATURE','REVISION_CONFLICT','VERSION_NOT_FOUND','INVALID_TRANSITION','HUMAN_REVIEW_REQUIRED','APPROVAL_REQUIRED','CONVERSION_STILL_RUNNING','APPROVED_VERSION_IMMUTABLE','LOCKED_BLUEPRINT','VALIDATION_FAILED','CONVERSION_UNAVAILABLE','CONVERSION_HTTP_ERROR','CONVERSION_TIMEOUT','CONVERSION_NETWORK_ERROR','CONVERSION_INVALID_OUTPUT','NO_DRAFT_TO_COPY']);
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const token=req.headers.get('Authorization');
  if(!token)return json({error:'UNAUTHORIZED'},401);
  const userClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}}});
  const {data:{user},error:authError}=await userClient.auth.getUser();
  if(authError||!user)return json({error:'UNAUTHORIZED'},401);
  const {data:allowed,error:adminError}=await userClient.rpc('is_activity_admin');
  if(adminError||allowed!==true)return json({error:'ADMIN_REQUIRED'},403);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const write=async(action:string,version:string|null,payload:Record<string,unknown>)=>{
    const {data,error}=await admin.rpc('activity_admin_write',{p_actor:user.id,p_action:action,p_version:version,p_payload:payload});
    if(error)throw new Error(safeErrors.has(error.message)?error.message:'REQUEST_FAILED');
    return data;
  };
  try {
    const raw=await req.text(); if(raw.length>4_000_000)return json({error:'REQUEST_TOO_LARGE'},413);
    const body=JSON.parse(raw);
    if(body.action==='create'){
      if(typeof body.path!=='string'||!body.path.startsWith(user.id+'/')||typeof body.filename!=='string')return json({error:'INVALID_SOURCE'},400);
      const {data:file,error}=await admin.storage.from('activity-originals').download(body.path);
      if(error||!file)throw new Error('INVALID_SOURCE');
      const bytes=new Uint8Array(await file.arrayBuffer()),mime=checkSource(body.filename,bytes);
      const id=await write('create',null,{storage_path:body.path,filename:body.filename,mime_type:mime,bytes:bytes.length});
      return json({id},201);
    }
    if(typeof body.versionId!=='string')return json({error:'VERSION_NOT_FOUND'},404);
    const {data:version,error}=await admin.from('activity_versions').select('*').eq('id',body.versionId).single();
    if(error||!version)return json({error:'VERSION_NOT_FOUND'},404);
    const [{data:root},{data:key},{data:source}]=await Promise.all([
      admin.from('teaching_activities').select('*').eq('id',version.activity_id).single(),
      admin.from('activity_answer_keys').select('answer_key').eq('version_id',version.id).maybeSingle(),
      admin.from('activity_sources').select('*').eq('id',version.source_id).single(),
    ]);
    const document=version.document?{...version.document,answerKey:key?.answer_key??[]}:null;
    if(body.action==='get')return json({version:{...version,document},source,blueprint:root?.locked_blueprint});
    if(body.action==='validate'){
      const report=validateActivity(body.document??document,root?.locked_blueprint);
      return json({validation:report});
    }
    if(body.action==='convert'){
      const apiKey=Deno.env.get('OPENAI_API_KEY'),model=Deno.env.get('ACTIVITY_CONVERSION_MODEL')??'gpt-4.1';
      if(!apiKey||!model)throw new Error('CONVERSION_UNAVAILABLE');
      await write('begin_convert',version.id,{revision:body.revision});
      const revision=version.revision+1,started=Date.now();
      let requestId:string|null=null,httpStatus:number|null=null,inputTokens=0,outputTokens=0,success=false,errorCode:string|null=null;
      try {
        const variant=typeof body.variation==='string'&&body.variation.trim();
        if(variant && !root?.locked_blueprint)throw new Error('LOCKED_BLUEPRINT');
        let bytes:Uint8Array|undefined;
        if(!variant) {
          const {data:file,error:fileError}=await admin.storage.from('activity-originals').download(source.storage_path);
          if(fileError||!file)throw new Error('INVALID_SOURCE');
          bytes=new Uint8Array(await file.arrayBuffer());checkSource(source.filename,bytes);
        }
        const result=await convertActivity({apiKey,model,bytes,filename:source.filename,mime:source.mime_type,
          current:variant?activitySchema.parse(document):undefined,blueprint:root?.locked_blueprint,variation:variant?body.variation.slice(0,2000):undefined});
        requestId=result.requestId;httpStatus=result.httpStatus;inputTokens=result.inputTokens;outputTokens=result.outputTokens;
        const validation=validateActivity(result.document,root?.locked_blueprint);
        await write('finish_convert',version.id,{revision,document:result.document,validation});success=true;
        return json({id:version.id,validation});
      } catch(reason) {
        const e=reason as {message?:string;requestId?:string;httpStatus?:number;inputTokens?:number;outputTokens?:number};
        errorCode=safeErrors.has(e.message??'')?e.message!:'CONVERSION_FAILED';requestId=e.requestId??requestId;httpStatus=e.httpStatus??httpStatus;inputTokens=e.inputTokens??inputTokens;outputTokens=e.outputTokens??outputTokens;
        await write('fail_convert',version.id,{revision,note:errorCode}).catch(()=>undefined);
        return json({error:errorCode},502);
      } finally {
        const {error:logError}=await admin.from('ai_usage').insert({user_id:user.id,provider:'openai',model,feature:'activity_conversion',success,error_code:errorCode,
          request_id:requestId,http_status:httpStatus,input_tokens:inputTokens,output_tokens:outputTokens,latency_ms:Date.now()-started,retryable:!success&&(httpStatus===null||httpStatus===429||httpStatus>=500),retry_count:0});
        if(logError)console.error('ACTIVITY_USAGE_LOG_FAILED', /^[A-Z0-9_]{1,20}$/.test(logError.code??'')?logError.code:'UNKNOWN');
      }
    }
    const payload:Record<string,unknown>={revision:body.revision,note:typeof body.note==='string'?body.note.slice(0,500):''};
    if(body.action==='save'){
      const candidate=activitySchema.safeParse(body.document);
      if(!candidate.success)return json({error:'INVALID_DOCUMENT',validation:validateActivity(body.document)},400);
      payload.document=candidate.data;payload.validation=validateActivity(candidate.data,root?.locked_blueprint);
    } else if(body.action==='approve') {
      const candidate=activitySchema.safeParse(document);
      if(!candidate.success)return json({error:'VALIDATION_FAILED',validation:validateActivity(document)},422);
      const validation=validateActivity(candidate.data,root?.locked_blueprint);
      if(validation.errors.length)return json({error:'VALIDATION_FAILED',validation},422);
      payload.document=document;payload.validation=validation;payload.blueprint=blueprintFor(candidate.data);
      payload.human_reviewed=body.humanReviewed===true;
    } else if(!['submit','publish','reject','retire','fork','recover_conversion'].includes(body.action))return json({error:'INVALID_ACTION'},400);
    const id=await write(body.action,version.id,payload);
    return json({id});
  } catch(reason) {
    const message=reason instanceof Error?reason.message:'';
    return json({error:safeErrors.has(message)?message:'REQUEST_FAILED'},message==='REVISION_CONFLICT'?409:400);
  }
});
