import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import { activityAction,activityAudit,listActivities,type ActivityDetail,type ActivityVersion,type LibraryFilters } from '@/services/activity-library';
import { activitySchema,statuses,validateActivity,type ActivityDocument } from '@/domain/activities';
import { exampleActivity } from '@/domain/activity-example';
import { sourceMime } from '../../../supabase/functions/_shared/activity-files';
import ActivityPreview from './ActivityPreview.web';
import ActivityEditor from './ActivityEditor.web';
import AnswerEditor from './AnswerEditor.web';
import { libraryStyles } from './styles';
const emptyFilters:LibraryFilters={language:'',level:'',skill:'',grammarPoint:'',category:'',status:'',version:''};
const label=(s:string)=>s.replaceAll('_',' ');
const errorText:Record<string,string>={
  ADMIN_REQUIRED:'Administrator access is required. Ask the project owner to grant your account access.',
  REVISION_CONFLICT:'Someone saved a newer revision. Your edits are still here; reload the version before trying again.',
  VALIDATION_FAILED:'Resolve the validation errors before approving.',
  CONVERSION_TIMEOUT:'Conversion exceeded two minutes. Your original is safe. Try a shorter worksheet or ask the project owner to check the dedicated conversion model.',
  CONVERSION_NETWORK_ERROR:'The conversion service could not be reached. Your original is safe; try again when the connection is available.',
  CONVERSION_HTTP_ERROR:'The conversion provider rejected the request (CONVERSION_HTTP_ERROR). Check the conversion model, schema and provider limits.',
  CONVERSION_INVALID_OUTPUT:'Conversion returned an incomplete or invalid draft (CONVERSION_INVALID_OUTPUT). Your original is safe.',
  CONVERSION_FAILED:'Conversion failed before a valid draft was saved (CONVERSION_FAILED). Your original is safe.',
  UNAUTHORIZED:'Your session has expired. Sign out and sign in again.',
  CONVERSION_UNAVAILABLE:'AI conversion is not configured. Use manual editing, or configure the conversion model and API key.',
  CONVERSION_STILL_RUNNING:'Conversion is still running. Recovery becomes available after five minutes.',
  LOCKED_BLUEPRINT:'This version must preserve the locked teaching structure.',
};
export default function ActivityLibrary(){
  const [access,setAccess]=useState<'checking'|'login'|'denied'|'admin'>('checking');
  const [accountId,setAccountId]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [filters,setFilters]=useState<LibraryFilters>(emptyFilters);
  const [rows,setRows]=useState<(ActivityVersion&{source:{filename:string}})[]>([]);
  const [page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
  const [detail,setDetail]=useState<ActivityDetail|null>(null);
  const [editor,setEditor]=useState(''),[dirty,setDirty]=useState(false);
  const [tab,setTab]=useState('preview'),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[failure,setFailure]=useState(false);
  const [original,setOriginal]=useState<{url:string;text:string;mime:string}|null>(null);
  const [audit,setAudit]=useState<Awaited<ReturnType<typeof activityAudit>>>([]);
  const [admins,setAdmins]=useState<Record<string,string>>({});
  const [reviewed,setReviewed]=useState(false),[note,setNote]=useState(''),[variation,setVariation]=useState('');
  const selection=useRef(0),originalUrl=useRef('');
  const say=(message:string,error=false)=>{setNotice(message);setFailure(error);};
  useEffect(()=>{if(notice)document.querySelector('.al-banner')?.scrollIntoView({block:'center',behavior:'smooth'});},[notice]);
  const checkAccess=async()=>{
    if(!supabase){setAccess('denied');return;}
    const {data:{user}}=await supabase.auth.getUser();setAccountId(user?.id??'');
    if(!user){setAccess('login');setDetail(null);setEditor('');return;}
    const {data,error}=await supabase.rpc('is_activity_admin');
    setAccess(!error&&data===true?'admin':'denied');
    if(error||data!==true){setDetail(null);setEditor('');}
  };
  useEffect(()=>{
    void checkAccess();
    const listener=supabase?.auth.onAuthStateChange(()=>{setTimeout(()=>void checkAccess(),0);});
    const timer=setInterval(()=>void checkAccess(),60000);
    return()=>{listener?.data.subscription.unsubscribe();clearInterval(timer);if(originalUrl.current)URL.revokeObjectURL(originalUrl.current);};
  },[]);
  const refresh=async(nextPage=0)=>{const data=await listActivities(filters,nextPage);setRows(r=>nextPage?[...r,...data]:data);setPage(nextPage);setHasMore(data.length===50);};
  useEffect(()=>{if(access!=='admin')return;const timer=setTimeout(()=>{void refresh().catch(()=>say('Could not load the library.',true));},250);return()=>clearTimeout(timer);},[access,filters]);
  useEffect(()=>{if(access==='admin')void supabase?.from('activity_administrators').select('user_id,label').then(({data})=>setAdmins(Object.fromEntries((data??[]).map(a=>[a.user_id,a.label]))));},[access]);
  const parsed=useMemo(()=>{try{return activitySchema.safeParse(JSON.parse(editor));}catch{return null;}},[editor]);
  const doc=parsed?.success?parsed.data:null;
  const report=useMemo(()=>{try{return validateActivity(JSON.parse(editor),detail?.blueprint);}catch{return {errors:[{code:'JSON',path:'document',message:'Enter a valid activity document.'}],warnings:[]};}},[editor,detail?.blueprint]);
  const readOnly=Boolean(detail?.version.approved_at)||detail?.version.status==='converting';
  const change=(document:ActivityDocument)=>{setEditor(JSON.stringify(document,null,2));setDirty(true);setReviewed(false);};
  async function selectVersion(id:string,force=false){
    if(dirty&&!force&&!window.confirm('Discard unsaved draft edits?'))return;
    const request=++selection.current;setBusy('Loading version');setOriginal(null);
    try{
      const loaded=await activityAction<ActivityDetail>('get',{versionId:id});
      if(request!==selection.current)return;
      setDetail(loaded);setEditor(loaded.version.document?JSON.stringify(loaded.version.document,null,2):'');setDirty(false);setReviewed(false);setNote('');
      setAudit(await activityAudit(loaded.version.activity_id));
      if(originalUrl.current){URL.revokeObjectURL(originalUrl.current);originalUrl.current='';}
      const {data:blob,error}=await supabase!.storage.from('activity-originals').download(loaded.source.storage_path);
      if(error||!blob)throw new Error('ORIGINAL_UNAVAILABLE');
      const url=URL.createObjectURL(blob);let text='';
      if(loaded.source.mime_type==='text/plain')text=await blob.text();
      if(loaded.source.mime_type.includes('wordprocessingml')){
        const mammoth=await import('mammoth/mammoth.browser');
        text=(await mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()})).value;
      }
      if(request!==selection.current){URL.revokeObjectURL(url);return;}
      originalUrl.current=url;setOriginal({url,text,mime:loaded.source.mime_type});
    }catch(e){say(errorText[(e as Error).message]??'Could not load this version or its original.',true);}
    finally{if(request===selection.current)setBusy('');}
  }
  async function run(action:string){
    if(!detail||busy)return;
    setBusy(label(action));setNotice('');
    try{
      if(action==='validate'){say(report.errors.length?'Validation found issues. Review the list below.':'Mechanical checks passed. Human review is still required.',Boolean(report.errors.length));return;}
      const result=await activityAction(action,{versionId:detail.version.id,revision:detail.version.revision,
        ...(action==='save'?{document:JSON.parse(editor)}:{}),humanReviewed:reviewed,note,
        ...(action==='convert'&&variation.trim()?{variation:variation.trim()}:{})});
      await refresh();await selectVersion(result.id,true);setVariation('');
      say(action==='approve'?'Approved. This version and its blueprint are now locked.':action==='publish'?'Published. Learners can now access this approved version.':action==='convert'?'Conversion complete. Review the draft against the original.':label(action)+' complete.');
    }catch(e){say(errorText[(e as Error).message]??'The action could not be completed ('+(/^[A-Z_]+$/.test((e as Error).message)?(e as Error).message:'REQUEST_FAILED')+'). Your edits are preserved.',true);}
    finally{setBusy('');}
  }
  async function upload(file:File){
    if(busy)return;setBusy('Uploading original');setNotice('');
    try{
      const mime=sourceMime(file.name);if(!mime||!file.size||file.size>10485760)throw new Error('INVALID_SOURCE');
      const {data:{user}}=await supabase!.auth.getUser();if(!user)throw new Error('ADMIN_REQUIRED');
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150);
      const path=user.id+'/'+crypto.randomUUID()+'/'+safeName;
      const {error}=await supabase!.storage.from('activity-originals').upload(path,file,{contentType:mime,upsert:false});
      if(error)throw new Error('UPLOAD_FAILED');
      const result=await activityAction('create',{path,filename:file.name});
      await refresh();await selectVersion(result.id,true);say('Original uploaded privately. Convert it or begin a manual draft.');
    }catch(e){say((e as Error).message==='INVALID_SOURCE'?'Choose a DOCX, PDF, TXT, PNG, JPG or WebP file up to 10 MB.':errorText[(e as Error).message]??'Upload failed. Check your access and connection.',true);}
    finally{setBusy('');}
  }
  const header=<style>{libraryStyles}</style>;
  if(access!=='admin')return <div className="al-root">{header}<div className="al-login"><span className="al-private">PRIVATE · ADMINISTRATORS ONLY</span><h1>Ferson Activity Library</h1>
    {access==='checking'?<p>Checking your access…</p>:access==='denied'?<><p>Your account does not have Activity Library access. The project owner must explicitly add your Supabase user ID to the administrator list.</p><p className="al-muted">Your user ID: <code>{accountId}</code></p><button onClick={()=>void supabase?.auth.signOut()}>Use another account</button></>:<form onSubmit={async e=>{e.preventDefault();setBusy('Signing in');const {error}=await supabase!.auth.signInWithPassword({email:email.trim(),password});setPassword('');setBusy('');if(error)say('Could not sign in. Check your credentials.',true);else await checkAccess();}}>
    <p>Sign in with your existing administrator account on your PC.</p><label className="al-field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="al-field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={Boolean(busy)}>Sign in</button></form>}
    {notice&&<p role="alert">{notice}</p>}<p className="al-muted">Learner accounts cannot access uploads, drafts, or answer keys.</p></div></div>;
  const status=detail?.version.status;
  return <div className="al-root">{header}<aside className="al-sidebar"><div className="al-brand">ferson<small>TEACHING STUDIO</small></div><div className="al-nav">▤ &nbsp; Activity Library</div><p>Original materials.<br/>Thoughtful review.<br/>Ready-to-use activities.</p><footer><span className="al-private">PRIVATE WORKSPACE</span><p>Every publication requires<br/>an administrator’s approval.</p><button className="al-secondary" onClick={()=>void supabase?.auth.signOut()}>Sign out</button></footer></aside>
    <main className="al-main"><header className="al-top"><div><span className="al-kicker">Your teaching materials</span><h1>Activity Library</h1><p>Upload, shape and review. Publish only when it is ready.</p></div><span className="al-private">✓ &nbsp; Administrator access</span></header>
      {notice&&<div className="al-banner" data-error={failure} role={failure?'alert':'status'}>{notice}</div>}
      <div className="al-upload"><div><strong>Add an original from your PC</strong><p>DOCX, PDF, TXT, PNG, JPG or WebP · up to 10 MB · stored privately</p></div><input aria-label="Upload original worksheet" type="file" disabled={Boolean(busy)} accept=".docx,.pdf,.txt,.png,.jpg,.jpeg,.webp" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></div>
      <section className="al-panel"><div className="al-panel-title"><h2>Your library <span className="al-muted">· {rows.length} versions loaded</span></h2><button className="al-secondary" disabled={Boolean(busy)} onClick={()=>void refresh().catch(()=>say('Could not refresh.',true))}>Refresh</button></div>
        <div className="al-filters">{(['language','level','skill','grammarPoint','category','status','version'] as const).map(name=><label key={name}>{name==='grammarPoint'?'Grammar point':name[0]!.toUpperCase()+name.slice(1)}
          {name==='status'||name==='language'||name==='level'?<select value={filters[name]} onChange={e=>setFilters(f=>({...f,[name]:e.target.value}))}><option value="">All</option>{(name==='status'?statuses:name==='language'?['en','es']:['A1','A2','B1','B2','C1','C2']).map(v=><option key={v} value={v}>{label(v)}</option>)}</select>:<input aria-label={'Filter '+name} type={name==='version'?'number':'text'} min={name==='version'?1:undefined} placeholder="All" value={filters[name]} onChange={e=>setFilters(f=>({...f,[name]:e.target.value}))}/>}
        </label>)}</div>
        {rows.length?<table className="al-table"><thead><tr><th>Activity / original</th><th>Language · level</th><th>Skill / grammar</th><th>Status</th><th>Version</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} data-selected={detail?.version.id===row.id}><td><button disabled={Boolean(busy)} onClick={()=>void selectVersion(row.id)}>{row.document?.metadata?.title??row.source.filename}</button><small>{row.source.filename}</small></td><td>{row.document?.metadata?.language??'—'} · {row.document?.metadata?.level??'—'}</td><td>{row.document?.metadata?.skill??'Not converted'}<small>{row.document?.metadata?.grammarPoint}</small></td><td><span className="al-badge" data-status={row.status}>{label(row.status)}</span></td><td>v{row.version}</td></tr>)}</tbody></table>:<div className="al-empty"><h2>A home for your best teaching materials</h2><p>Upload your first worksheet, or adjust the filters to find an activity.</p></div>}
        {hasMore&&<button className="al-secondary" onClick={()=>void refresh(page+1)}>Load more versions</button>}
      </section>
      {detail&&<section className="al-workspace"><div className="al-work-header"><div><h2>{doc?.metadata.title??detail.source.filename}</h2><span className="al-version-info">Version {detail.version.version} · revision {detail.version.revision} {dirty?'· Unsaved edits':''} {detail.blueprint?'· Teaching blueprint locked':''}</span></div><div className="al-actions"><span className="al-badge" data-status={status}>{label(status!)}</span><button className="al-secondary" disabled={Boolean(busy)} onClick={()=>void selectVersion(detail.version.id)}>Reload</button></div></div>
        <div className="al-review-grid"><section className="al-panel"><div className="al-panel-title"><h2>Original material</h2>{original&&<a href={original.url} download={detail.source.filename}>Download original</a>}</div>
          {original?.mime.includes('wordprocessingml')&&<p className="al-note">DOCX text preview. Download the original to check page layout, tables and illustrations.</p>}
          <div className="al-original">{!original?<p>Loading original…</p>:original.mime.startsWith('image/')?<img src={original.url} alt="Original worksheet"/>:original.mime==='application/pdf'?<iframe title="Original PDF" src={original.url} sandbox="allow-same-origin"/>:<pre>{original.text}</pre>}</div>
        </section>
        <section className="al-panel"><nav className="al-tabs" aria-label="Review views">{[['preview','Interactive preview'],['edit','Edit draft'],['answers','Answer key'],['blueprint','Blueprint'],['json','Advanced JSON'],['history','Audit history']].map(([value,title])=><button role="tab" aria-selected={tab===value} key={value} onClick={()=>setTab(value!)}>{title}</button>)}</nav>
          {!editor&&tab!=='history'?<div className="al-empty"><h2>Ready for a first draft</h2><p>Conversion prepares a draft. It cannot approve or publish.</p><div className="al-actions"><button disabled={Boolean(busy)} onClick={()=>void run('convert')}>Convert original to draft</button><button className="al-secondary" disabled={Boolean(busy)} onClick={()=>{change(exampleActivity());setTab('edit');}}>Begin a manual draft</button></div><p className="al-muted">Manual drafts begin with an eight-type example. Replace its content with your material before saving.</p></div>
          :tab==='json'?<textarea className="al-code" aria-label="Advanced activity JSON" spellCheck={false} readOnly={readOnly} value={editor} onChange={e=>{setEditor(e.target.value);setDirty(true);setReviewed(false);}}/>
          :tab==='history'?<div className="al-history">{audit.map(a=><article key={a.id}><strong>{label(a.action)} · {label(a.to_status)}</strong><small>{admins[a.actor_id]??a.actor_id} · {new Date(a.created_at).toLocaleString()}</small><small>Version ID: {a.version_id}</small>{a.note&&<p>{a.note}</p>}</article>)}</div>
          :tab==='blueprint'?<div className="al-blueprint"><h3>{detail.blueprint?'Locked teaching contract':'Blueprint locks on first approval'}</h3><p>The order, objective, required forms, counts, transformations, gaps and dependencies must survive every later variation.</p><pre>{JSON.stringify(detail.blueprint??{objective:doc?.objective,requiredForms:doc?.requiredForms,targetItemCount:doc?.targetItemCount},null,2)}</pre></div>
          :doc?tab==='edit'?<ActivityEditor document={doc} onChange={change} locked={Boolean(detail.blueprint)} readOnly={readOnly}/>:tab==='answers'?<AnswerEditor document={doc} onChange={change} readOnly={readOnly}/>:<ActivityPreview document={doc}/>:<div className="al-empty">The document needs a valid structure. Open Advanced JSON and review the validation errors.</div>}
          {editor&&<div className="al-validation"><strong>{report.errors.length?report.errors.length+' checks need attention':'✓ Mechanical checks passed'}</strong><ul>{report.errors.slice(0,30).map((e,i)=><li className="al-error" key={i}>{e.path}: {e.message}</li>)}{report.warnings.map(w=><li key={w.code}>{w.message}</li>)}</ul><div className="al-actions"><button className="al-secondary" disabled={Boolean(busy)} onClick={()=>void run('validate')}>Validate</button>{!readOnly&&<button disabled={Boolean(busy)||!dirty||!doc} onClick={()=>void run('save')}>Save draft</button>}{detail.version.document&&<button className="al-secondary" disabled={Boolean(busy)||dirty||status==='converting'} onClick={()=>void run('fork')}>New draft version</button>}</div></div>}
          <div className="al-approval">
            {status==='converted_draft'&&<button disabled={Boolean(busy)||dirty} onClick={()=>void run('submit')}>Send to review</button>}
            {status==='needs_review'&&<><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I compared this version with the original and checked the teaching structure, answer key, acceptable alternatives, required forms and Student A/B gaps.</label><button disabled={Boolean(busy)||dirty||!reviewed||report.errors.length>0} onClick={()=>void run('approve')}>Approve and lock version</button></>}
            {status==='approved'&&<button disabled={Boolean(busy)||dirty} onClick={()=>void run('publish')}>Publish approved version</button>}
            {['converted_draft','needs_review','approved','published'].includes(status!)&&<div className="al-actions" style={{marginTop:12}}><input aria-label="Audit note" placeholder="Review / retirement note (optional)" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/><button className="al-danger" disabled={Boolean(busy)||dirty} onClick={()=>void run(status==='approved'||status==='published'?'retire':'reject')}>{status==='approved'||status==='published'?'Retire version':'Reject draft'}</button></div>}
            {Boolean(detail.blueprint)&&!readOnly&&detail.version.document&&<details style={{marginTop:16}}><summary>Create an AI surface variation</summary><p className="al-muted">Only names, story, setting and surface vocabulary may change. The locked blueprint will be validated again.</p><input aria-label="Variation setting" maxLength={2000} value={variation} onChange={e=>setVariation(e.target.value)} placeholder="For example: set the activity at a train station"/><button style={{marginTop:8}} disabled={Boolean(busy)||dirty||!variation.trim()} onClick={()=>void run('convert')}>Convert this draft into a variation</button></details>}
            {status==='converting'&&<button className="al-secondary" disabled={Boolean(busy)} onClick={()=>void run('recover_conversion')}>Recover stalled conversion (after 5 minutes)</button>}
          </div>
        </section></div>
      </section>}
      <p className="al-footer" role="status">{busy?busy+'…':'Only approved, published versions are available to learners. Originals, drafts, keys and Student B notes stay private.'}</p>
    </main>
  </div>;
}
