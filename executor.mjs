import os from 'node:os';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { issueWorkspaceCapability } from './capability.mjs';
const exec=promisify(execFile);
const HELPER=process.env.CODEBRIDGE_HELPER||path.join(process.cwd(),'native-helper','.build','debug','codebridge-helper');

const RULES={
 pwd:{safe:()=>true},
 ls:{safe:a=>a.every(x=>!x.startsWith('--')||['--color=never'].includes(x))},
 git:{safe:a=>['status','diff','log','branch','show','rev-parse'].includes(a[0]), destructive:a=>a[0]==='reset'||a[0]==='clean'},
 npm:{safe:a=>a[0]==='test'||(a[0]==='run'&&['test','build','lint','typecheck'].includes(a[1]))},
 pnpm:{safe:a=>a[0]==='test'||(a[0]==='run'&&['test','build','lint','typecheck'].includes(a[1]))},
 yarn:{safe:a=>a[0]==='test'||(a[0]==='run'&&['test','build','lint','typecheck'].includes(a[1]))},
 node:{safe:a=>a[0]==='--version'||a[0]==='-v'}
};
const NEVER=new Set(['sudo','su','doas','shutdown','reboot','mkfs','diskutil','launchctl']);
export function classifyExec(executable,args=[]){const name=path.basename(executable);if(NEVER.has(name))return 'blocked';const r=RULES[name];if(!r)return 'approval';if(r.destructive?.(args))return 'destructive';if(r.safe?.(args))return 'safe';return 'approval'}
export function cleanEnv(){const env={PATH:process.env.PATH||'/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',HOME:os.homedir(),TMPDIR:os.tmpdir(),LANG:process.env.LANG||'en_US.UTF-8',TERM:'dumb',CODEBRIDGE:'1',CI:'1'};if(process.env.CODEBRIDGE_HOME)env.CODEBRIDGE_HOME=process.env.CODEBRIDGE_HOME;return env}
function callHelper(payload,timeout){return new Promise((resolve,reject)=>{const child=spawn(HELPER,['exec'],{env:cleanEnv(),stdio:['pipe','pipe','pipe'],shell:false});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Object.assign(new Error('Native helper timed out.'),{code:'ETIMEDOUT'}))},Math.min(Math.max(timeout,1000),125000));child.stdout.on('data',d=>{out+=d;if(out.length>3_000_000)child.kill('SIGKILL')});child.stderr.on('data',d=>{err+=d});child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);if(code===0)return resolve({stdout:out,stderr:err});const e=Object.assign(new Error(`Native helper exited ${code}`),{stdout:out,stderr:err,code});reject(e)});child.stdin.end(payload)})}
export async function executeStructured({cwd,executable,args=[],approved=false,timeout=120000}){if(typeof executable!=='string'||!executable||!Array.isArray(args)||args.some(x=>typeof x!=='string'))throw Object.assign(new Error('Invalid structured command.'),{status:400});if(args.length>128||args.some(x=>x.length>8192))throw Object.assign(new Error('Command arguments exceed CodeBridge limits.'),{status:400});const kind=classifyExec(executable,args);if(kind==='blocked')throw Object.assign(new Error(`${path.basename(executable)} is blocked by CodeBridge.`),{status:403});if((kind==='approval'||kind==='destructive')&&!approved)return {approvalRequired:true,kind,executable,args,cwd};let r;try{const capability=await issueWorkspaceCapability({workspace:cwd,executable,args,ttlMs:Math.min(timeout+5000,120000)});const payload=JSON.stringify({cwd,executable,args,timeoutMs:timeout,capability});r=await callHelper(payload,timeout);const parsed=JSON.parse(r.stdout.trim());if(!parsed.ok)throw Object.assign(new Error(parsed.error||parsed.stderr||'Native helper failed.'),{status:500});return {ok:true,kind,stdout:parsed.stdout,stderr:parsed.stderr,exitCode:parsed.exitCode,helper:'native'}}catch(e){if(e.code==='ENOENT')throw Object.assign(new Error('CodeBridge native execution helper is not installed.'),{status:503});if(e.stdout){try{const parsed=JSON.parse(String(e.stdout).trim());throw Object.assign(new Error(parsed.error||parsed.stderr||'Native helper failed.'),{status:500})}catch(parsedError){if(parsedError.status)throw parsedError}}throw e}}
