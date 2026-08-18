import crypto from 'node:crypto';
import { handleMcp } from './mcp.mjs';

const sessions=new Map();
function sessionId(req){return String(req.headers['mcp-session-id']||'')}
export function mcpHeaders(extra={}){return {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}}
export async function handleHttpMcp(req,res,bodyReader){
  if(req.method==='GET'){
    res.writeHead(405,{allow:'POST'});return res.end();
  }
  if(req.method==='DELETE'){
    const id=sessionId(req);if(id)sessions.delete(id);res.writeHead(204);return res.end();
  }
  if(req.method!=='POST'){res.writeHead(405,{allow:'POST, DELETE'});return res.end()}
  let msg;try{msg=await bodyReader(req)}catch(e){res.writeHead(e.status||400,mcpHeaders());return res.end(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:e.message||'Parse error'}}))}
  const isInit=msg?.method==='initialize';let sid=sessionId(req);
  if(!sid&&isInit){sid=crypto.randomUUID();sessions.set(sid,{createdAt:Date.now()})}
  else if(sid&&!sessions.has(sid)){res.writeHead(404,mcpHeaders());return res.end(JSON.stringify({jsonrpc:'2.0',id:msg?.id??null,error:{code:-32001,message:'Unknown MCP session'}}))}
  const out=await handleMcp(msg);
  if(out===null){res.writeHead(202,sid?{'mcp-session-id':sid}:{});return res.end()}
  res.writeHead(200,mcpHeaders(sid?{'mcp-session-id':sid}:{}));res.end(JSON.stringify(out))
}
