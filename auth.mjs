import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';

const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(process.env.HOME||'', '.codebridge');
const SECRET=path.join(APP_DIR,'local-secret');
const port=Number(process.env.PORT||4317);
export async function localSecret(){await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});try{await fsp.chmod(APP_DIR,0o700)}catch{}try{return (await fsp.readFile(SECRET,'utf8')).trim()}catch{const s=crypto.randomBytes(32).toString('base64url');try{await fsp.writeFile(SECRET,s,{mode:0o600,flag:'wx'});return s}catch(e){if(e.code==='EEXIST')return (await fsp.readFile(SECRET,'utf8')).trim();throw e}}}
export function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;return origin===`http://127.0.0.1:${port}`||origin===`http://localhost:${port}`}

// A forged Host header is how DNS rebinding reaches a loopback-bound server: the
// page keeps its own origin (so Origin checks pass) but the Host it sends is the
// attacker's domain. Pinning Host to the loopback names we actually listen on
// closes that path.
export function validHost(req){const host=String(req.headers.host||'');return [`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`].includes(host)}

export async function authorize(req,url){if(url.pathname==='/'||!(url.pathname.startsWith('/api/')||url.pathname==='/mcp'))return true;if(!validHost(req))return false;if(req.method==='GET'&&url.pathname==='/api/session')return sameOrigin(req);if(req.method==='GET'&&url.pathname==='/api/status')return sameOrigin(req);if(!sameOrigin(req))return false;const expected=await localSecret(),got=String(req.headers['x-codebridge-token']||'');if(!got||got.length!==expected.length)return false;return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(expected))}
