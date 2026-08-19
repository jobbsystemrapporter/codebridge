import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sandboxCapabilities } from './sandbox.mjs';
import { executeStructured } from './executor.mjs';
const execFileAsync=promisify(execFile);

export const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(os.homedir(),'.codebridge');
const CONFIG=path.join(APP_DIR,'config.json');
const AUDIT=path.join(APP_DIR,'audit.jsonl');
const BLOCKED=['.ssh','.aws','.gnupg','Library/Keychains','Library/Mail','Library/Messages','.config/gcloud','.kube'];
const destructive=/(^|[;&|]\s*)rm\s+-[^\n;&|]*r|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-|\bsudo\b|\bmkfs\b|\bshutdown\b|\breboot\b|\bkill\s+-9\b|\bdocker\s+system\s+prune\b/i;
const safe=/^(pwd|ls\b|git\s+(status|diff|log|branch)\b|npm\s+(test|run\s+(test|build|lint))\b|pnpm\s+(test|run\s+(test|build|lint))\b|yarn\s+(test|run\s+(test|build|lint))\b)/i;

export async function init(){await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});try{await fsp.access(CONFIG)}catch{await saveConfig({version:1,setupComplete:false,allowedRoots:[],securityMode:'safe',chatgpt:{connected:false},createdAt:new Date().toISOString()})}}
export async function getConfig(){await init();const c=JSON.parse(await fsp.readFile(CONFIG,'utf8'));const roots=Array.isArray(c.allowedRoots)?c.allowedRoots:[];const cleaned=[];for(const root of roots){const base=path.basename(root);if((!process.env.CODEBRIDGE_HOME)&&(/^codebridge-(?:e2e|compat|cutover)-/i.test(base)||/^cb[xyz]-/i.test(base)))continue;try{const st=await fsp.stat(root);if(st.isDirectory())cleaned.push(root)}catch{}}const unique=[...new Set(cleaned)];if(unique.length!==roots.length){c.allowedRoots=unique;await saveConfig(c)}return c}
export async function saveConfig(v){await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});await fsp.writeFile(CONFIG,JSON.stringify(v,null,2),{mode:0o600});return v}
export async function patchConfig(p){const c=await getConfig();return saveConfig({...c,...p})}
export async function resetAllData(){
  const app=path.resolve(APP_DIR),home=path.resolve(os.homedir()),root=path.parse(app).root;
  if(app===home||app===root)throw Object.assign(new Error('Refusing to wipe a broad path.'),{status:500});
  await fsp.rm(app,{recursive:true,force:true});
  await init();
  return {ok:true};
}
// CODEBRIDGE_HOME isolates state for tests, but the launch agent lives outside it.
// Without an override, running the suite tears down the real user's agent — so the
// path is overridable and the launchd domain is only touched on a real install.
const isolated=!!process.env.CODEBRIDGE_HOME;
export const LAUNCH_AGENT=process.env.CODEBRIDGE_LAUNCH_AGENT||path.join(os.homedir(),'Library','LaunchAgents','com.codebridge.app.plist');
export async function removeLaunchAgent(){
  try{await fsp.rm(LAUNCH_AGENT,{force:true})}catch{}
}
// Deleting the plist does not unload a job launchd already has in memory, and the
// agent runs with KeepAlive — so without this, exiting on uninstall just gets the
// service restarted. bootout terminates this process too, hence the exit fallback.
export async function unloadLaunchAgent(){
  if(isolated)return;
  try{await execFileAsync('/bin/launchctl',['bootout',`gui/${process.getuid()}/com.codebridge.app`])}catch{}
}
export function expand(p){return path.resolve(p.replace(/^~(?=\/|$)/,os.homedir()))}
function blocked(p){const abs=expand(p);return BLOCKED.some(x=>abs===path.join(os.homedir(),x)||abs.startsWith(path.join(os.homedir(),x)+path.sep))}
async function canonicalExisting(p){return fsp.realpath(expand(p))}
async function canonicalForWrite(p){const abs=expand(p);try{return await fsp.realpath(abs)}catch{const parent=await fsp.realpath(path.dirname(abs));return path.join(parent,path.basename(abs))}}
export async function assertAllowed(target,{write=false}={}){const c=await getConfig(),abs=write?await canonicalForWrite(target):await canonicalExisting(target);if(blocked(abs))throw Object.assign(new Error('Sensitive location is blocked by CodeBridge policy.'),{status:403});let ok=false;for(const configured of c.allowedRoots){let root;try{root=await fsp.realpath(expand(configured))}catch{continue}if(abs===root||abs.startsWith(root+path.sep)){ok=true;break}}if(!ok)throw Object.assign(new Error('Path is outside allowed project folders.'),{status:403});return abs}
export async function addRoot(root){const abs=await canonicalExisting(root);if(blocked(abs))throw Object.assign(new Error('That folder is protected.'),{status:403});const st=await fsp.stat(abs);if(!st.isDirectory())throw new Error('Selected path is not a folder.');const c=await getConfig();c.allowedRoots=[...new Set([...c.allowedRoots,abs])];await saveConfig(c);await audit('workspace.add',{path:abs});return c}
export async function removeRoot(root){const c=await getConfig(),abs=expand(root);c.allowedRoots=c.allowedRoots.filter(x=>expand(x)!==abs);await saveConfig(c);await audit('workspace.remove',{path:abs});return c}
export async function listWorkspace(root){const abs=await assertAllowed(root);const rows=await fsp.readdir(abs,{withFileTypes:true});return rows.filter(x=>!x.name.startsWith('.')).slice(0,250).map(x=>({name:x.name,type:x.isDirectory()?'directory':'file'}))}
export async function readText(file){const abs=await assertAllowed(file);const st=await fsp.stat(abs);if(st.size>1024*1024)throw Object.assign(new Error('File is larger than 1 MB.'),{status:413});const text=await fsp.readFile(abs,'utf8');await audit('file.read',{path:abs});return text}
export async function writeText(file,content){const abs=await assertAllowed(file,{write:true});await fsp.mkdir(path.dirname(abs),{recursive:true});await fsp.writeFile(abs,content,'utf8');await audit('file.write',{path:abs,bytes:Buffer.byteLength(content)});return {ok:true}}
export function classifyCommand(command){if(destructive.test(command))return 'destructive';if(safe.test(command.trim()))return 'safe';return 'write'}
export async function runStructuredCommand(cwd,executable,args=[],approved=false){const dir=await assertAllowed(cwd);const result=await executeStructured({cwd:dir,executable,args,approved});await audit(result.approvalRequired?'command.approval_required':'command.run',{cwd:dir,executable,args,kind:result.kind});return result}
export async function runCommand(cwd,command,approved=false){const dir=await assertAllowed(cwd);const cfg=await getConfig(),kind=classifyCommand(command);if(cfg.securityMode==='safe')return {approvalRequired:true,kind:'legacy-shell',command,cwd:dir,message:'Free-form shell is disabled in Safe mode. Use structured execution.'};if((kind==='destructive'||kind==='write')&&!approved)return {approvalRequired:true,kind,command,cwd:dir};const {stdout,stderr}=await execFileAsync('/bin/zsh',['-lc',command],{cwd:dir,timeout:120000,maxBuffer:2*1024*1024,env:{PATH:process.env.PATH||'/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',HOME:os.homedir(),TMPDIR:os.tmpdir(),LANG:process.env.LANG||'en_US.UTF-8',TERM:'dumb',CODEBRIDGE:'1',CI:'1'}});await audit('command.legacy_shell',{cwd:dir,command,kind});return {ok:true,kind:'legacy-shell',stdout,stderr,sandboxed:false}}
export async function gitInfo(root){const cwd=await assertAllowed(root);try{const [status,branch]=await Promise.all([execFileAsync('git',['status','--short'],{cwd}),execFileAsync('git',['branch','--show-current'],{cwd})]);return {isGit:true,branch:branch.stdout.trim(),changes:status.stdout.trim().split('\n').filter(Boolean).length,status:status.stdout}}catch{return {isGit:false}}}
export async function doctor(){const cfg=await getConfig();const checks=[];checks.push({name:'Configuration',ok:true,detail:CONFIG});checks.push({name:'Allowed project folders',ok:cfg.allowedRoots.length>0,detail:`${cfg.allowedRoots.length} configured`});for(const [name,cmd,args] of [['Git','git',['--version']],['Node.js','node',['--version']]]){try{const r=await execFileAsync(cmd,args);checks.push({name,ok:true,detail:r.stdout.trim()})}catch{checks.push({name,ok:false,detail:'Not found'})}}checks.push({name:'Public HTTPS address',ok:/^https:\/\//i.test(cfg.chatgpt?.actionBaseUrl||''),detail:cfg.chatgpt?.actionBaseUrl||'Not configured yet'});checks.push({name:'ChatGPT Action',ok:!!cfg.chatgpt?.connected,detail:cfg.chatgpt?.connected?'Connected':'Waiting for first GPT action'});const sb=await sandboxCapabilities();checks.push({name:'Process sandbox',ok:sb.available,detail:sb.detail});return {healthy:checks.every(x=>x.ok||['Public HTTPS address','ChatGPT Action','Process sandbox'].includes(x.name)),checks}}
export async function audit(action,data={}){await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});await fsp.appendFile(AUDIT,JSON.stringify({at:new Date().toISOString(),action,...data})+'\n',{mode:0o600})}
export async function history(){try{return (await fsp.readFile(AUDIT,'utf8')).trim().split('\n').filter(Boolean).slice(-100).reverse().map(JSON.parse)}catch{return []}}
export async function systemStatus(){const cfg=await getConfig();return {version:'0.2.0-beta.3',platform:process.platform,config:cfg,doctor:await doctor()}}
