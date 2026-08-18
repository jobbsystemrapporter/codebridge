import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';

const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(process.env.HOME||'', '.codebridge');
const SECRET=path.join(APP_DIR,'local-secret');
const port=Number(process.env.PORT||4317);
export async function localSecret(){await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});try{await fsp.chmod(APP_DIR,0o700)}catch{}try{return (await fsp.readFile(SECRET,'utf8')).trim()}catch{const s=crypto.randomBytes(32).toString('base64url');try{await fsp.writeFile(SECRET,s,{mode:0o600,flag:'wx'});return s}catch(e){if(e.code==='EEXIST')return (await fsp.readFile(SECRET,'utf8')).trim();throw e}}}
export function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;return origin===`http://127.0.0.1:${port}`||origin===`http://localhost:${port}`}
export async function authorize(req,url){if(url.pathname==='/'||!url.pathname.startsWith('/api/'))return true;if(req.method==='GET'&&['/api/status','/api/session'].includes(url.pathname))return sameOrigin(req);if(!sameOrigin(req))return false;const expected=await localSecret(),got=String(req.headers['x-codebridge-token']||'');if(!got||got.length!==expected.length)return false;return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(expected))}
