import crypto from 'node:crypto';
import { localSecret } from './auth.mjs';
import { consumeNonce } from './replay.mjs';

function b64url(v){return Buffer.from(v).toString('base64url')}
function from64(v){return Buffer.from(v,'base64url')}
export async function issueWorkspaceCapability({workspace,executable,args,ttlMs=60_000}){
  const now=Date.now(),payload={v:1,workspace,executable,args,iat:now,exp:now+Math.min(Math.max(ttlMs,5_000),120_000),nonce:crypto.randomBytes(12).toString('base64url')};
  const body=b64url(JSON.stringify(payload)),secret=await localSecret(),sig=crypto.createHmac('sha256',secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export async function verifyWorkspaceCapability(token){
  const [body,sig]=String(token||'').split('.');if(!body||!sig)throw Object.assign(new Error('Invalid workspace capability.'),{status:403});
  const secret=await localSecret(),expected=crypto.createHmac('sha256',secret).update(body).digest();let got;try{got=from64(sig)}catch{throw Object.assign(new Error('Invalid workspace capability signature.'),{status:403})}
  if(got.length!==expected.length||!crypto.timingSafeEqual(got,expected))throw Object.assign(new Error('Workspace capability signature mismatch.'),{status:403});
  let payload;try{payload=JSON.parse(from64(body).toString('utf8'))}catch{throw Object.assign(new Error('Invalid workspace capability payload.'),{status:403})}
  if(payload.v!==1||Date.now()>payload.exp||payload.exp-payload.iat>120_000)throw Object.assign(new Error('Workspace capability expired or invalid.'),{status:403});
  if(!consumeNonce(payload.nonce,payload.exp))throw Object.assign(new Error('Workspace capability was already used.'),{status:403});
  return payload;
}
