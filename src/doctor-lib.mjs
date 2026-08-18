import fs from'node:fs/promises';import path from'node:path';import{getConfig,APP_DIR}from'./core.mjs';import{transportStatus}from'./transport.mjs';
export async function runDoctor(){const checks=[];async function check(name,fn,required=true){try{checks.push({name,ok:true,required,detail:await fn()})}catch(e){checks.push({name,ok:false,required,detail:e.message})}}
await check('config',async()=>`${(await getConfig()).allowedRoots.length} allowed project(s)`);
await check('local state permissions',async()=>{await fs.mkdir(APP_DIR,{recursive:true,mode:0o700});await fs.chmod(APP_DIR,0o700);const s=await fs.stat(APP_DIR);if((s.mode&0o077)!==0)throw Error('CodeBridge state is accessible by other local users');return 'private'});
await check('local secret',async()=>{const p=path.join(APP_DIR,'local-secret');try{const s=await fs.stat(p);if((s.mode&0o077)!==0)throw Error('local secret permissions are too broad');return 'private file (0600)'}catch(e){if(e.code==='ENOENT')return 'created on first authenticated request';throw e}});
await check('secure internet connection',async()=>{const t=await transportStatus();if(!t.running)throw Error('not connected yet');return t.runningUrl||t.url},false);
await check('ChatGPT Action',async()=>{const c=await getConfig();if(!c.chatgpt?.connected)throw Error('waiting for the first GPT connection test');return 'connected'},false);
return {ok:checks.filter(x=>x.required).every(x=>x.ok),ready:checks.every(x=>x.ok),checks}}
