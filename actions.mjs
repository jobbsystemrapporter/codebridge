import { actionSecret } from './action-auth.mjs';
import { getConfig,patchConfig,listWorkspace,readText,writeText,gitInfo,runCommand,audit } from './core.mjs';

const cleanBase=value=>String(value||'').trim().replace(/\/+$/,'');

export async function actionSetup(){
  const cfg=await getConfig();
  const baseUrl=cleanBase(cfg.chatgpt?.actionBaseUrl);
  return {
    baseUrl,
    configured:/^https:\/\//i.test(baseUrl),
    secret:await actionSecret(),
    schema:baseUrl?openApiSchema(baseUrl):null,
    instructions:gptInstructions()
  };
}

export async function configureAction({baseUrl}){
  const value=cleanBase(baseUrl);
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value))throw Object.assign(new Error('Enter the public HTTPS address only, for example https://example.ngrok-free.app'),{status:400});
  const cfg=await getConfig();
  await patchConfig({...cfg,chatgpt:{...(cfg.chatgpt||{}),actionBaseUrl:value,connected:false}});
  await audit('chatgpt.action.configure',{host:new URL(value).host});
  return actionSetup();
}

export function gptInstructions(){return `You are a coding assistant connected to the user's Mac through CodeBridge. Use CodeBridge actions whenever you need to inspect or change local projects. Start with listProjects; never guess paths. Only access project folders returned by CodeBridge. Read files before editing them. Prefer targeted edits and preserve existing code. Use runCommand for tests and inspection. If CodeBridge says approval is required, tell the user exactly what needs approval instead of pretending it ran. Never ask for or reveal the CodeBridge bearer secret.`}

const objectResponse=properties=>({type:'object',properties,additionalProperties:true});

export function openApiSchema(baseUrl){return {
  openapi:'3.1.0',
  info:{title:'CodeBridge',version:'1.0.0',description:'Work safely with code projects selected by the user on their Mac.'},
  servers:[{url:cleanBase(baseUrl)}],
  paths:{
    '/actions/health':{get:{operationId:'codebridgeHealth',summary:'Check the CodeBridge connection',responses:{'200':{description:'Connection status',content:{'application/json':{schema:objectResponse({ok:{type:'boolean'},service:{type:'string'},message:{type:'string'}})}}}}}},
    '/actions/projects':{get:{operationId:'listProjects',summary:'List project folders the user allowed CodeBridge to access',responses:{'200':{description:'Allowed projects',content:{'application/json':{schema:objectResponse({projects:{type:'array',items:{type:'string'}}})}}}}}},
    '/actions/files':{post:{operationId:'listFiles',summary:'List files in an allowed project directory',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{path:{type:'string'}},required:['path']}}}},responses:{'200':{description:'Directory entries',content:{'application/json':{schema:objectResponse({entries:{type:'array',items:{type:'object',properties:{name:{type:'string'},path:{type:'string'},type:{type:'string'}},additionalProperties:true}}})}}}}}},
    '/actions/read':{post:{operationId:'readFile',summary:'Read a UTF-8 text file',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{path:{type:'string'}},required:['path']}}}},responses:{'200':{description:'File content',content:{'application/json':{schema:objectResponse({path:{type:'string'},content:{type:'string'}})}}}}}},
    '/actions/write':{post:{operationId:'writeFile',summary:'Create or replace a UTF-8 text file inside an allowed project',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content']}}}},responses:{'200':{description:'Write result',content:{'application/json':{schema:objectResponse({path:{type:'string'},ok:{type:'boolean'},written:{type:'boolean'}})}}}}}},
    '/actions/git':{post:{operationId:'gitStatus',summary:'Get Git branch and working tree status for a project',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{path:{type:'string'}},required:['path']}}}},responses:{'200':{description:'Git status',content:{'application/json':{schema:objectResponse({branch:{type:'string'},status:{type:'string'},clean:{type:'boolean'}})}}}}}},
    '/actions/command':{post:{operationId:'runCommand',summary:'Run a shell command in an allowed project subject to CodeBridge safety policy',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{cwd:{type:'string'},command:{type:'string'},approved:{type:'boolean'}},required:['cwd','command']}}}},responses:{'200':{description:'Command result or approval requirement',content:{'application/json':{schema:objectResponse({ok:{type:'boolean'},stdout:{type:'string'},stderr:{type:'string'},approvalRequired:{type:'boolean'},message:{type:'string'}})}}}}}}
  }
}}

export async function handleAction(req,url,body){
  if(req.method==='GET'&&url.pathname==='/actions/health'){
    const cfg=await getConfig();
    await patchConfig({...cfg,chatgpt:{...(cfg.chatgpt||{}),connected:true,lastSeenAt:new Date().toISOString()}});
    await audit('chatgpt.action.connected');
    return {ok:true,service:'CodeBridge',message:'Connected to this Mac.'};
  }
  if(req.method==='GET'&&url.pathname==='/actions/projects'){
    const cfg=await getConfig();return {projects:cfg.allowedRoots};
  }
  const b=await body(req);
  if(req.method==='POST'&&url.pathname==='/actions/files')return {entries:await listWorkspace(b.path)};
  if(req.method==='POST'&&url.pathname==='/actions/read')return {path:b.path,content:await readText(b.path)};
  if(req.method==='POST'&&url.pathname==='/actions/write')return {path:b.path,...await writeText(b.path,String(b.content??''))};
  if(req.method==='POST'&&url.pathname==='/actions/git')return await gitInfo(b.path);
  if(req.method==='POST'&&url.pathname==='/actions/command')return await runCommand(b.cwd,String(b.command||''),!!b.approved);
  throw Object.assign(new Error('Not found'),{status:404});
}
