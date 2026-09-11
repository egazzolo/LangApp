import { supabase } from './supabase/client';
import type { ActivityDocument, ActivityStatus, ValidationReport } from '@/domain/activities';
export interface ActivityVersion {
  id:string;activity_id:string;source_id:string;version:number;revision:number;status:ActivityStatus;
  document:ActivityDocument|null;validation:ValidationReport|null;approved_at:string|null;approved_by:string|null;approved_digest:string|null;created_at:string;updated_at:string;
}
export interface ActivitySource {filename:string;storage_path:string;mime_type:string;bytes:number;}
export interface ActivityDetail {version:ActivityVersion;source:ActivitySource;blueprint:unknown;}
export interface LibraryFilters {language:string;level:string;skill:string;grammarPoint:string;category:string;status:string;version:string;}
export async function activityAction<T = {id:string}>(action:string,body:Record<string,unknown>={}):Promise<T>{
  if(!supabase)throw new Error('SUPABASE_NOT_CONFIGURED');
  const {data,error}=await supabase.functions.invoke('activity-admin',{body:{...body,action}});
  if(error){
    let code='REQUEST_FAILED';
    try{const response=(error as {context?:Response}).context;const detail=await response?.clone().json();if(typeof detail?.error==='string'&&/^[A-Z_]+$/.test(detail.error))code=detail.error;}catch{}
    throw new Error(code);
  }
  return data as T;
}
export async function listActivities(filters:LibraryFilters,page=0){
  if(!supabase)throw new Error('SUPABASE_NOT_CONFIGURED');
  let q=supabase.from('activity_versions').select('*,source:activity_sources(filename)').order('created_at',{ascending:false}).order('id').range(page*50,page*50+49);
  for(const field of ['language','level','skill','grammarPoint','category'] as const)if(filters[field])q=q.eq('document->metadata->>'+field,filters[field]);
  if(filters.status)q=q.eq('status',filters.status);
  if(filters.version)q=q.eq('version',Number(filters.version));
  const {data,error}=await q;if(error)throw new Error('LIBRARY_UNAVAILABLE');
  return data as (ActivityVersion&{source:{filename:string}})[];
}
export async function activityAudit(activityId:string){
  if(!supabase)throw new Error('SUPABASE_NOT_CONFIGURED');
  const {data,error}=await supabase.from('activity_audit').select('*').eq('activity_id',activityId).order('id',{ascending:false}).limit(100);
  if(error)throw new Error('AUDIT_UNAVAILABLE');return data??[];
}
export async function publishedActivity(action:string,body:Record<string,unknown>={}){
  if(!supabase)throw new Error('SUPABASE_NOT_CONFIGURED');
  const {data,error}=await supabase.functions.invoke('activity-player',{body:{...body,action}});
  if(error)throw new Error('ACTIVITY_UNAVAILABLE');return data;
}
