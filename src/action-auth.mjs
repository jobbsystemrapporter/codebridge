import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';

const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(process.env.HOME||'', '.codebridge');
const SECRET=path.join(APP_DIR,'action-secret');

export async function actionSecret(){
  await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});
  try{return (await fsp.readFile(SECRET,'utf8')).trim()}catch{
    const value=crypto.randomBytes(32).toString('base64url');
    try{await fsp.writeFile(SECRET,value,{mode:0o600,flag:'wx'});return value}catch(e){
      if(e.code==='EEXIST')return (await fsp.readFile(SECRET,'utf8')).trim();
      throw e;
    }
  }
}

export async function authorizeAction(req){
  const header=String(req.headers.authorization||'');
  const match=/^Bearer\s+(.+)$/i.exec(header);
  if(!match)return false;
  const expected=await actionSecret(),got=match[1];
  if(got.length!==expected.length)return false;
  return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(expected));
}
