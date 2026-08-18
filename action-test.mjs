import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'codebridge-action-'));
const home=path.join(tmp,'state'),project=path.join(tmp,'project'),port=4397,pub=4398;
await fs.mkdir(project);await fs.writeFile(path.join(project,'hello.txt'),'hello');
const helper=process.env.CODEBRIDGE_HELPER||path.join(process.cwd(),'native-helper','.build','release','codebridge-helper');
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,CODEBRIDGE_HOME:home,PORT:String(port),CODEBRIDGE_PUBLIC_PORT:String(pub),CODEBRIDGE_HELPER:helper},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`,pubBase=`http://127.0.0.1:${pub}`;
try{
  await new Promise(r=>setTimeout(r,600));
  const local=await fs.readFile(path.join(home,'local-secret'),'utf8').catch(()=>null);
  if(!local)await fetch(`${base}/api/session`);
  const token=(await fs.readFile(path.join(home,'local-secret'),'utf8')).trim();
  const localHeaders={'content-type':'application/json','x-codebridge-token':token};
  // Browser-style same-origin POST must pass on the configured port (Origin header included).
  let r=await fetch(`${base}/api/workspaces`,{method:'POST',headers:{...localHeaders,origin:`http://127.0.0.1:${port}`},body:JSON.stringify({path:project})});
  assert.equal(r.status,200);
  r=await fetch(`${base}/api/chatgpt/setup`,{method:'PUT',headers:localHeaders,body:JSON.stringify({baseUrl:'https://example.ngrok-free.app',privacyPolicyUrl:'https://example.com/privacy'})});
  assert.equal(r.status,200);const setup=await r.json();assert.equal(setup.schema.servers[0].url,'https://example.ngrok-free.app');assert.equal(setup.privacyPolicyUrl,'https://example.com/privacy');assert.ok(setup.secret.length>=32);
  // Admin surface must NOT serve actions, and the public surface must NOT serve admin/MCP/UI.
  r=await fetch(`${base}/actions/projects`);assert.equal(r.status,404);
  r=await fetch(`${pubBase}/api/session`);assert.equal(r.status,404);
  r=await fetch(`${pubBase}/mcp`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,404);
  r=await fetch(`${pubBase}/actions/projects`);assert.equal(r.status,401);
  const auth={authorization:`Bearer ${setup.secret}`,'content-type':'application/json'};
  r=await fetch(`${pubBase}/actions/projects`,{headers:auth});assert.equal(r.status,200);const projects=(await r.json()).projects;assert.equal(projects.length,1);assert.equal(await fs.realpath(projects[0]),await fs.realpath(project));
  r=await fetch(`${pubBase}/actions/read`,{method:'POST',headers:auth,body:JSON.stringify({path:path.join(project,'hello.txt')})});assert.equal((await r.json()).content,'hello');
  r=await fetch(`${pubBase}/actions/health`,{headers:auth});assert.equal(r.status,200);
  await fs.writeFile(path.join(project,'AGENTS.md'),'# Agent\nCODEWORD: OPEN WORKS\n');
  r=await fetch(`${pubBase}/actions/open`,{method:'POST',headers:auth,body:JSON.stringify({path:project})});assert.equal(r.status,200);
  const opened=await r.json();assert.equal(opened.ok,true);assert.ok(opened.workspaceId);assert.ok(opened.agentsFiles.some(f=>f.name==='AGENTS.md'&&f.content.includes('OPEN WORKS')));
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,executable:'pwd',args:[]})});assert.equal(r.status,200);
  const pwd=await r.json();assert.equal(pwd.ok,true);assert.equal(pwd.stdout.trim(),await fs.realpath(project));
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,executable:'git',args:['--version']})});assert.equal(r.status,200);
  const needApproval=await r.json();assert.equal(needApproval.approvalRequired,true);assert.ok(needApproval.approvalId);
  r=await fetch(`${base}/api/approvals/decide`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:needApproval.approvalId,allow:true})});assert.equal(r.status,200);
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,executable:'git',args:['--version'],approvalId:needApproval.approvalId})});assert.equal(r.status,200);
  const approvedRun=await r.json();assert.equal(approvedRun.ok,true);assert.match(approvedRun.stdout,/git version/);
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,executable:'git',args:['--version']})});const deniedReq=await r.json();
  await fetch(`${base}/api/approvals/decide`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:deniedReq.approvalId,allow:false})});
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,executable:'git',args:['--version'],approvalId:deniedReq.approvalId})});assert.equal((await r.json()).denied,true);
  r=await fetch(`${base}/api/config`,{method:'PATCH',headers:localHeaders,body:JSON.stringify({securityMode:'developer',setupComplete:true})});assert.equal(r.status,200);
  r=await fetch(`${pubBase}/actions/command`,{method:'POST',headers:auth,body:JSON.stringify({cwd:project,command:'pwd'})});assert.equal(r.status,200);
  const devShell=await r.json();assert.equal(devShell.ok,true);assert.equal(devShell.stdout.trim(),await fs.realpath(project));
  r=await fetch(`${base}/api/status`,{headers:{'x-codebridge-token':token}});assert.equal((await r.json()).config.chatgpt.connected,true);
  console.log('Custom GPT Action bridge + bearer auth + isolation + open_workspace + approval flow passed.');
} finally {child.kill('SIGTERM');await fs.rm(tmp,{recursive:true,force:true})}
