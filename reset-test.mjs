import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function start(port){
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'codebridge-reset-'));
  const home=path.join(tmp,'state'),project=path.join(tmp,'project');
  await fs.mkdir(project);
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,CODEBRIDGE_HOME:home,PORT:String(port),CODEBRIDGE_PUBLIC_PORT:String(port+1)},stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  const deadline=Date.now()+5000;
  let up=false;
  while(Date.now()<deadline){
    try{const r=await fetch(`${base}/api/session`);if(r.ok){up=true;break}}catch{}
    await new Promise(r=>setTimeout(r,150));
  }
  if(!up){child.kill('SIGTERM');throw new Error('server did not start')}
  const token=(await fs.readFile(path.join(home,'local-secret'),'utf8')).trim();
  return {tmp,home,project,child,base,token};
}

const s=await start(4407);
try{
  const h={'content-type':'application/json','x-codebridge-token':s.token};
  let r=await fetch(`${s.base}/api/workspaces`,{method:'POST',headers:h,body:JSON.stringify({path:s.project})});assert.equal(r.status,200);
  await fs.mkdir(path.join(s.home,'worktrees'),{recursive:true});
  r=await fetch(`${s.base}/api/reset`,{method:'POST',headers:h,body:'{}'});assert.equal(r.status,400);
  r=await fetch(`${s.base}/api/reset`,{method:'POST',headers:h,body:JSON.stringify({confirm:true})});assert.equal(r.status,200);
  const entries=(await fs.readdir(s.home)).sort();
  assert.deepEqual(entries,['audit.jsonl','config.json']);
  const cfg=JSON.parse(await fs.readFile(path.join(s.home,'config.json'),'utf8'));
  assert.equal(cfg.allowedRoots.length,0);
  assert.equal(cfg.setupComplete,false);
  console.log('Erase-all (reset) passed.');
} finally { s.child.kill('SIGTERM'); await fs.rm(s.tmp,{recursive:true,force:true}); }

const u=await start(4408);
try{
  const h={'content-type':'application/json','x-codebridge-token':u.token};
  let r=await fetch(`${u.base}/api/uninstall`,{method:'POST',headers:h,body:'{}'});assert.equal(r.status,400);
  r=await fetch(`${u.base}/api/uninstall`,{method:'POST',headers:h,body:JSON.stringify({confirm:true})});assert.equal(r.status,200);
  const exited=await new Promise(res=>{const t=setTimeout(()=>res(false),3000);u.child.once('exit',()=>{clearTimeout(t);res(true)})});
  assert.equal(exited,true);
  const entries=(await fs.readdir(u.home)).sort();
  assert.deepEqual(entries,['audit.jsonl','config.json']);
  console.log('Uninstall (wipe + exit) passed.');
} finally { u.child.kill('SIGTERM'); await fs.rm(u.tmp,{recursive:true,force:true}); }
