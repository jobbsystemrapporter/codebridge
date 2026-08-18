import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { init,getConfig,patchConfig,addRoot,removeRoot,listWorkspace,readText,writeText,runCommand,gitInfo,doctor,history,systemStatus,audit,resetAllData,removeLaunchAgent,unloadLaunchAgent } from './core.mjs';
import { handleMcp } from './mcp.mjs';
import { handleHttpMcp } from './mcp-http.mjs';
import { createSafeWorkspace,reviewSafeWorkspace,discardSafeWorkspace,applySafeWorkspace,commitSafeWorkspace } from './worktrees.mjs';
import { transportStatus,startTransport,stopTransport,startTransportIfConfigured } from './transport.mjs';
import { deleteKeychainSecret } from './keychain.mjs';
import { localSecret,authorize } from './auth.mjs';
import { listApprovals,decideApproval } from './approvals.mjs';
import { getAccessMode,setAccessMode } from './capabilities.mjs';
import { actionSetup,configureAction,handleAction } from './actions.mjs';
import { authorizeAction } from './action-auth.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4317);
const publicPort=Number(process.env.CODEBRIDGE_PUBLIC_PORT||4318);
await init();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2_000_000)throw Object.assign(new Error('Request too large'),{status:413})}return raw?JSON.parse(raw):{}};
async function api(req,res,url){try{
  if(!(await authorize(req,url)))return json(res,403,{error:'CodeBridge local authorization failed.'});
  if(url.pathname==='/api/session'&&req.method==='GET')return json(res,200,{token:await localSecret()});
  if(url.pathname==='/mcp')return handleHttpMcp(req,res,body)
  if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,await systemStatus());
  if(req.method==='GET'&&url.pathname==='/api/config')return json(res,200,{...(await getConfig()),accessMode:await getAccessMode()});
  if(req.method==='PUT'&&url.pathname==='/api/access-mode'){const b=await body(req);return json(res,200,await setAccessMode(b.accessMode))}
  if(req.method==='PATCH'&&url.pathname==='/api/config'){const b=await body(req);if(!['safe','developer'].includes(b.securityMode))throw Object.assign(new Error('securityMode must be safe or developer.'),{status:400});return json(res,200,await patchConfig({securityMode:b.securityMode,setupComplete:!!b.setupComplete}))}
  if(req.method==='POST'&&url.pathname==='/api/workspaces'){const b=await body(req);return json(res,200,await addRoot(b.path))}
  if(req.method==='DELETE'&&url.pathname==='/api/workspaces'){const b=await body(req);return json(res,200,await removeRoot(b.path))}
  if(req.method==='GET'&&url.pathname==='/api/files')return json(res,200,await listWorkspace(url.searchParams.get('path')||''));
  if(req.method==='GET'&&url.pathname==='/api/file')return json(res,200,{content:await readText(url.searchParams.get('path')||'')});
  if(req.method==='PUT'&&url.pathname==='/api/file'){const b=await body(req);return json(res,200,await writeText(b.path,String(b.content??'')))}
  if(req.method==='POST'&&url.pathname==='/api/command'){const b=await body(req);return json(res,200,await runCommand(b.cwd,b.command,!!b.approved))}
  if(req.method==='GET'&&url.pathname==='/api/git')return json(res,200,await gitInfo(url.searchParams.get('path')||''));
  if(req.method==='GET'&&url.pathname==='/api/doctor')return json(res,200,await doctor());
  if(req.method==='GET'&&url.pathname==='/api/history')return json(res,200,await history());
  if(req.method==='GET'&&url.pathname==='/api/approvals')return json(res,200,{items:listApprovals()});
  if(req.method==='POST'&&url.pathname==='/api/approvals/decide'){const b=await body(req);return json(res,200,decideApproval(b.id,!!b.allow))}
  if(req.method==='GET'&&url.pathname==='/api/transport')return json(res,200,await transportStatus());
  if(req.method==='POST'&&url.pathname==='/api/transport/start'){const b=await body(req);return json(res,200,await startTransport(b.authtoken))}
  if(req.method==='GET'&&url.pathname==='/api/chatgpt/setup')return json(res,200,await actionSetup());
  if(req.method==='PUT'&&url.pathname==='/api/chatgpt/setup'){const b=await body(req);return json(res,200,await configureAction(b))}
  if(req.method==='GET'&&url.pathname==='/api/chatgpt/preflight'){const cfg=await getConfig(),setup=await actionSetup();const checks=[{id:'core',ok:true,label:'CodeBridge Core'},{id:'project',ok:cfg.allowedRoots.length>0,label:'At least one project selected'},{id:'https',ok:setup.configured,label:'Public HTTPS address configured'},{id:'action',ok:!!cfg.chatgpt?.connected,label:'ChatGPT Action reached this Mac'}];return json(res,200,{ready:checks.every(x=>x.ok),localReady:checks.slice(0,2).every(x=>x.ok),checks,endpoint:setup.baseUrl?`${setup.baseUrl}/actions/health`:null})}
  if(req.method==='POST'&&url.pathname==='/api/worktree'){const b=await body(req);return json(res,200,await createSafeWorkspace(b.project))}
  if(req.method==='POST'&&url.pathname==='/api/worktree/review'){const b=await body(req);return json(res,200,await reviewSafeWorkspace(b.project,b.worktree))}
  if(req.method==='POST'&&url.pathname==='/api/worktree/discard'){const b=await body(req);return json(res,200,await discardSafeWorkspace(b.project,b.worktree))}
  if(req.method==='POST'&&url.pathname==='/api/worktree/apply'){const b=await body(req);return json(res,200,await applySafeWorkspace(b.project,b.worktree))}
  if(req.method==='POST'&&url.pathname==='/api/worktree/commit'){const b=await body(req);return json(res,200,await commitSafeWorkspace(b.project,b.worktree,b.message))}
  if(req.method==='POST'&&url.pathname==='/api/chatgpt/guide'){await audit('chatgpt.guide.opened');const cfg=await getConfig(),setup=await actionSetup(),transport=await transportStatus();const steps=[];if(!transport.running)steps.push({title:'Connect CodeBridge securely',action:'ngrok',url:'https://dashboard.ngrok.com/get-started/your-authtoken',detail:'Sign in to ngrok, copy your connection code, and paste it into CodeBridge. CodeBridge starts the secure address automatically.'});else if(!cfg.chatgpt?.connected)steps.push({title:'Add CodeBridge to your custom GPT',action:'custom-gpt',url:'https://chatgpt.com/gpts/editor',detail:'CodeBridge has prepared the instructions, Action schema, and private connection secret for you.'});else steps.push({title:'Connected',action:'connected',detail:'Your custom GPT has reached CodeBridge on this Mac.'});return json(res,200,{mode:'gpt-action',title:cfg.chatgpt?.connected?'Connected':'Next step',steps,automatic:false,setup})}
  if(req.method==='POST'&&url.pathname==='/api/reset'){const b=await body(req);if(b.confirm!==true)throw Object.assign(new Error('Confirmation required.'),{status:400});await stopTransport();await resetAllData();await deleteKeychainSecret();await audit('app.reset_all');return json(res,200,{ok:true,reset:true})}
  if(req.method==='POST'&&url.pathname==='/api/uninstall'){const b=await body(req);if(b.confirm!==true)throw Object.assign(new Error('Confirmation required.'),{status:400});await stopTransport();await resetAllData();await deleteKeychainSecret();await removeLaunchAgent();await audit('app.uninstall');setTimeout(async()=>{await unloadLaunchAgent();process.exit(0)},400);return json(res,200,{ok:true,uninstall:true})}
  return json(res,404,{error:'Not found'});
}catch(e){return json(res,e.status||500,{error:e.message})}}

// Public Action surface: ONLY authenticated /actions/*. Everything else is 404.
// This is the only surface ngrok ever exposes, so no admin API, MCP or UI leaks publicly.
async function publicApi(req,res,url){try{
  if(!url.pathname.startsWith('/actions/'))return json(res,404,{error:'Not found'});
  if(!(await authorizeAction(req)))return json(res,401,{error:'CodeBridge Action authorization failed.'});
  return json(res,200,await handleAction(req,url,body));
}catch(e){return json(res,e.status||500,{error:e.message})}}

const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'127.0.0.1'}`);if(url.pathname==='/mcp'||url.pathname.startsWith('/api/'))return api(req,res,url);const relative=url.pathname==='/'?'index.html':url.pathname.slice(1);if(relative.includes('..')){res.writeHead(403);return res.end('Forbidden')}try{const file=join(root,'public',relative),data=await readFile(file),ext=file.slice(file.lastIndexOf('.'));res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-store','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'"});res.end(data)}catch{res.writeHead(404);res.end('Not found')}});
server.listen(port,'127.0.0.1',()=>console.log(`CodeBridge is running at http://127.0.0.1:${port}`));
const publicServer=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'127.0.0.1'}`);return publicApi(req,res,url)});
publicServer.listen(publicPort,'127.0.0.1',()=>console.log(`CodeBridge public Action surface at http://127.0.0.1:${publicPort}`));
startTransportIfConfigured().catch(()=>{});
