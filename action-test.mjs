import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'codebridge-action-'));
const home=path.join(tmp,'state'),project=path.join(tmp,'project'),port=4397,pub=4398;
await fs.mkdir(project);await fs.writeFile(path.join(project,'hello.txt'),'hello');
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,CODEBRIDGE_HOME:home,PORT:String(port),CODEBRIDGE_PUBLIC_PORT:String(pub)},stdio:'ignore'});
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
  r=await fetch(`${base}/api/chatgpt/setup`,{method:'PUT',headers:localHeaders,body:JSON.stringify({baseUrl:'https://example.ngrok-free.app'})});
  assert.equal(r.status,200);const setup=await r.json();assert.equal(setup.schema.servers[0].url,'https://example.ngrok-free.app');assert.ok(setup.secret.length>=32);
  // Admin surface must NOT serve actions, and the public surface must NOT serve admin/MCP/UI.
  r=await fetch(`${base}/actions/projects`);assert.equal(r.status,404);
  r=await fetch(`${pubBase}/api/session`);assert.equal(r.status,404);
  r=await fetch(`${pubBase}/mcp`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,404);
  r=await fetch(`${pubBase}/actions/projects`);assert.equal(r.status,401);
  const auth={authorization:`Bearer ${setup.secret}`,'content-type':'application/json'};
  r=await fetch(`${pubBase}/actions/projects`,{headers:auth});assert.equal(r.status,200);const projects=(await r.json()).projects;assert.equal(projects.length,1);assert.equal(await fs.realpath(projects[0]),await fs.realpath(project));
  r=await fetch(`${pubBase}/actions/read`,{method:'POST',headers:auth,body:JSON.stringify({path:path.join(project,'hello.txt')})});assert.equal((await r.json()).content,'hello');
  r=await fetch(`${pubBase}/actions/health`,{headers:auth});assert.equal(r.status,200);
  r=await fetch(`${base}/api/status`,{headers:{'x-codebridge-token':token}});assert.equal((await r.json()).config.chatgpt.connected,true);
  console.log('Custom GPT Action bridge + bearer auth + public-surface isolation passed.');
} finally {child.kill('SIGTERM');await fs.rm(tmp,{recursive:true,force:true})}
