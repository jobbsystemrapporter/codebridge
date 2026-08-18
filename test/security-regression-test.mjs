// Regression tests for the three critical issues found in the 0.2.0-beta.1 review.
// Each test fails loudly if the corresponding hole is reopened.
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

const home=await fsp.mkdtemp(path.join(os.tmpdir(),'cbsec-'));
const proj=await fsp.mkdtemp(path.join(os.tmpdir(),'cbproj-'));
process.env.CODEBRIDGE_HOME=home;
process.env.CODEBRIDGE_LAUNCH_AGENT=path.join(home,'agent-marker.plist');
const helper=process.env.CODEBRIDGE_HELPER||path.join(process.cwd(),'native-helper','.build','release','codebridge-helper');
process.env.CODEBRIDGE_HELPER=helper;

await new Promise((res,rej)=>spawn('git',['init','-q'],{cwd:proj,stdio:'ignore'}).on('close',c=>c===0?res():rej(new Error('git init failed'))));

const core=await import('../src/core.mjs');
const {classifyExec}=await import('../src/executor.mjs');
const {requestApproval,decideApproval,consumeDecision}=await import('../src/approvals.mjs');
await core.addRoot(proj);

// --- 1. Executable allowlist must not be bypassable with a path ---------------
// A basename-only allowlist plus `/usr/bin/env <executable>` executed any binary
// whose filename happened to match an allowed name.
await fsp.writeFile(path.join(proj,'git'),'#!/bin/sh\necho PWNED\n',{mode:0o755});
for(const exe of ['./git','/tmp/evil/git','../../../bin/node','sub/dir/npm']){
  assert.equal(classifyExec(exe,['status']),'blocked',`${exe} must not classify as runnable`);
  await assert.rejects(()=>core.runStructuredCommand(proj,exe,['status'],false),/bare command name/,`${exe} must be refused`);
  // Even with approval already granted, a path-bearing executable stays refused.
  await assert.rejects(()=>core.runStructuredCommand(proj,exe,['status'],true),/bare command name/,`${exe} must be refused when approved`);
}
// The legitimate bare name still works and still resolves through the trusted PATH.
const ok=await core.runStructuredCommand(proj,'git',['status','--short'],false);
assert.ok(!ok.stdout?.includes('PWNED'),'bare git must not resolve to the workspace file');

// --- 2. An approval must only authorize the command the user actually saw -----
const q=requestApproval({type:'command',cwd:proj,executable:'git',args:['log'],kind:'approval',req:{cwd:proj,executable:'git',args:['log']}});
decideApproval(q.id,true);
assert.throws(()=>consumeDecision(q.id,{cwd:proj,executable:'git',args:['clean','-fdx']}),/different command/,'substituted args must be refused');

const q2=requestApproval({type:'command',cwd:proj,executable:'git',args:['log'],kind:'approval',req:{cwd:proj,executable:'git',args:['log']}});
decideApproval(q2.id,true);
assert.equal(consumeDecision(q2.id,{cwd:proj,executable:'git',args:['log']}).status,'approved','the approved command must still run');
assert.equal(consumeDecision(q2.id,{cwd:proj,executable:'git',args:['log']}),null,'a decision must be single-use');

// A denied decision stays denied even when the command matches.
const q3=requestApproval({type:'command',cwd:proj,executable:'git',args:['log'],kind:'approval',req:{cwd:proj,executable:'git',args:['log']}});
decideApproval(q3.id,false);
assert.equal(consumeDecision(q3.id,{cwd:proj,executable:'git',args:['log']}).status,'denied');

// --- 3. /mcp and /api/session must be authenticated and Host-pinned -----------
const port=4501+Math.floor(Math.random()*200),pub=port+1;
const srvHome=await fsp.mkdtemp(path.join(os.tmpdir(),'cbsrv-'));
const child=spawn(process.execPath,['src/server.mjs'],{env:{...process.env,CODEBRIDGE_HOME:srvHome,PORT:String(port),CODEBRIDGE_PUBLIC_PORT:String(pub),CODEBRIDGE_HELPER:helper},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
for(let i=0;i<80;i++){try{await fetch(`${base}/api/session`);break}catch{await new Promise(r=>setTimeout(r,100))}}
try{
  const mcpCall={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_projects',arguments:{}}};
  const jsonHeaders={'content-type':'application/json'};

  // Unauthenticated MCP must be refused.
  let r=await fetch(`${base}/mcp`,{method:'POST',headers:jsonHeaders,body:JSON.stringify(mcpCall)});
  assert.equal(r.status,403,'/mcp must require the local token');

  // A forged Host header (DNS rebinding) must be refused everywhere.
  const rawGet=(p,host)=>new Promise((resolve,reject)=>{
    const rq=http.request({host:'127.0.0.1',port,path:p,method:'GET',headers:{host}},rs=>{rs.resume();rs.on('end',()=>resolve(rs.statusCode))});
    rq.on('error',reject);rq.end();
  });
  for(const p of ['/mcp','/api/session','/api/status','/api/config']){
    assert.equal(await rawGet(p,'evil.example.com'),403,`${p} must reject a forged Host header`);
  }
  // The loopback names CodeBridge actually listens on stay reachable.
  assert.equal(await rawGet('/api/session',`127.0.0.1:${port}`),200,'loopback Host must still be accepted');

  // A cross-site Origin must be refused.
  r=await fetch(`${base}/api/config`,{headers:{origin:'https://evil.example.com'}});
  assert.equal(r.status,403,'cross-origin requests must be refused');

  // The real UI flow still works: bootstrap the token, then use it.
  const token=(await (await fetch(`${base}/api/session`)).json()).token;
  assert.ok(token,'session bootstrap must still work for the local UI');
  r=await fetch(`${base}/mcp`,{method:'POST',headers:{...jsonHeaders,'x-codebridge-token':token},body:JSON.stringify(mcpCall)});
  assert.equal(r.status,200,'authenticated MCP must work');
  assert.ok((await r.json()).result,'authenticated MCP must return a result');

  // securityMode must be validated rather than written through verbatim.
  r=await fetch(`${base}/api/config`,{method:'PATCH',headers:{...jsonHeaders,'x-codebridge-token':token},body:JSON.stringify({securityMode:'anything-goes'})});
  assert.equal(r.status,400,'securityMode must be validated');
}finally{child.kill()}

// --- 4. An isolated run must never touch the real user's launch agent --------
// reset-test drives /api/uninstall against a sandboxed CODEBRIDGE_HOME, but the
// agent lives outside it: without an override the suite deleted the user's real
// agent and booted out their running service.
const core2=await import('../src/core.mjs');
assert.ok(!core2.LAUNCH_AGENT.startsWith(path.join(os.homedir(),'Library','LaunchAgents')),
  'with CODEBRIDGE_LAUNCH_AGENT set, the real LaunchAgents path must not be used');
const realAgent=path.join(os.homedir(),'Library','LaunchAgents','com.codebridge.app.plist');
const marker=path.join(home,'agent-marker.plist');
await fsp.writeFile(marker,'<?xml version="1.0"?>\n');
const realExisted=await fsp.access(realAgent).then(()=>true,()=>false);
await core2.removeLaunchAgent();
assert.equal(await fsp.access(marker).then(()=>true,()=>false),false,'the overridden agent path must be removed');
assert.equal(await fsp.access(realAgent).then(()=>true,()=>false),realExisted,'the real launch agent must be untouched');

await fsp.rm(home,{recursive:true,force:true});
await fsp.rm(proj,{recursive:true,force:true});
await fsp.rm(srvHome,{recursive:true,force:true});
console.log('Security regression tests passed (executable allowlist, approval binding, local auth).');
