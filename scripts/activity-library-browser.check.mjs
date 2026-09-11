import { createRequire } from 'node:module';
import { readFileSync,existsSync,mkdirSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
const {chromium}=createRequire(process.env.PGLITE_PACKAGE+'/package.json')('playwright');
const fixtureModule={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('src/domain/activity-example.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:fixtureModule,exports:fixtureModule.exports});
const fixture=fixtureModule.exports.exampleActivity();
const root=path.resolve('dist-activity-library');
const server=http.createServer((req,res)=>{
  const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+requestPath);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if(existsSync(file+'.html'))file+='.html';else if(requestPath==='/')file=path.join(root,'index.html');
  try{const data=readFileSync(file),ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.woff':'font/woff'})[ext]??'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(8178,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const user={id:'10000000-0000-4000-8000-000000000001',email:'editor@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()};
const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url');
const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
mkdirSync('artifacts/activity-library',{recursive:true});
let version=null;const source={filename:'worksheet.txt',storage_path:user.id+'/fixture/worksheet.txt',mime_type:'text/plain',bytes:30};
const calls=[],errors=[],telemetry=[];
async function setup(mode){
  const context=await browser.newContext({viewport:{width:1480,height:1050}});
  if(mode!=='anonymous')await context.addInitScript(session=>localStorage.setItem('sb-hajbbzogslmqypxmaxsh-auth-token',JSON.stringify(session)),session);
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(/sentry|posthog/i.test(req.url()))telemetry.push(req.postData()??'');});
  await page.route('https://hajbbzogslmqypxmaxsh.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/auth/v1/user')return reply(user);
    if(url.pathname==='/rest/v1/rpc/is_activity_admin')return reply(mode==='admin');
    if(url.pathname==='/rest/v1/activity_administrators')return reply([{user_id:user.id,label:'Test editor'}]);
    if(url.pathname==='/rest/v1/activity_audit')return reply(calls.map((action,i)=>({id:i,actor_id:user.id,action,to_status:version?.status??'uploaded',created_at:new Date().toISOString(),version_id:version?.id,note:''})));
    if(url.pathname==='/rest/v1/activity_versions')return reply(version?[{...version,source:{filename:source.filename}}]:[]);
    if(url.pathname.startsWith('/storage/v1/object/')){
      if(req.method()==='POST')return reply({Key:source.storage_path});
      return route.fulfill({status:200,contentType:'text/plain',body:'Original teaching worksheet. Review all eight activities.'});
    }
    if(url.pathname==='/functions/v1/activity-admin'){
      assert.equal(mode,'admin','non-admin must not send admin actions');
      const body=req.postDataJSON();calls.push(body.action);
      if(body.action==='create'){version={id:'20000000-0000-4000-8000-000000000001',activity_id:'30000000-0000-4000-8000-000000000001',source_id:'source',version:1,revision:1,status:'uploaded',document:null,approved_at:null,validation:null,created_at:new Date().toISOString()};return reply({id:version.id});}
      if(body.action==='get')return reply({version,source,blueprint:null});
      if(body.action==='convert'){version.document=structuredClone(fixture);version.status='converted_draft';version.revision++;return reply({id:version.id});}
      if(body.action==='save'){version.document=body.document;version.status='converted_draft';version.revision++;return reply({id:version.id});}
      if(body.action==='submit'){version.status='needs_review';version.revision++;return reply({id:version.id});}
      if(body.action==='approve'){assert.equal(body.humanReviewed,true);version.status='approved';version.approved_at=new Date().toISOString();version.revision++;return reply({id:version.id});}
      if(body.action==='publish'){assert.equal(version.status,'approved');version.status='published';version.revision++;return reply({id:version.id});}
      return reply({error:'UNEXPECTED_TEST_ACTION'},400);
    }
    return reply({});
  });
  await page.goto('http://127.0.0.1:8178/admin/activity-library');
  return {page,context};
}
try {
  let {page,context}=await setup('anonymous');
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Upload original worksheet').count(),0);
  await page.screenshot({path:'artifacts/activity-library/sign-in.png',fullPage:true});await context.close();
  ({page,context}=await setup('learner'));
  await page.getByText('Your account does not have Activity Library access.',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('Upload original worksheet').count(),0);await context.close();
  ({page,context}=await setup('admin'));
  await page.getByLabel('Upload original worksheet').setInputFiles({name:'worksheet.txt',mimeType:'text/plain',buffer:Buffer.from('Teaching worksheet')});
  await page.getByRole('button',{name:'Convert original to draft'}).click();
  await page.getByRole('button',{name:'Send to review'}).waitFor();
  await page.getByLabel('goes',{exact:true}).check();
  await page.getByRole('button',{name:'Check response',exact:true}).first().click();
  await page.getByText('Correct.',{exact:true}).waitFor();
  await page.screenshot({path:'artifacts/activity-library/review.png',fullPage:true});
  await page.getByRole('tab',{name:'Edit draft',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Reviewed city activity');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByRole('button',{name:'Send to review'}).click();
  const approve=page.getByRole('button',{name:'Approve and lock version'});
  await approve.waitFor();assert.equal(await approve.isDisabled(),true);
  await page.getByRole('checkbox').check();await approve.click();
  await page.getByRole('button',{name:'Publish approved version'}).click();
  await page.getByText('Published. Learners can now access this approved version.').waitFor();
  assert.equal(await page.getByLabel('Title',{exact:true}).isDisabled(),true);
  assert.equal(version.status,'published');
  assert.ok(calls.includes('create')&&calls.includes('convert')&&calls.includes('approve')&&calls.includes('publish'));
  assert.equal(errors.length,0,'browser runtime errors: '+errors.join('; '));
  assert.ok(telemetry.every(payload=>!payload.includes('Reviewed city activity')&&!payload.includes('worksheet.txt')));
  await page.screenshot({path:'artifacts/activity-library/published.png',fullPage:true});
  console.log('Browser checks passed: anonymous/learner denial, PC upload, conversion, interactive preview, edit/save, explicit approval, publication and immutable UI.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
