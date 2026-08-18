import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fsp from 'node:fs/promises';
import path from 'node:path';

const exec=promisify(execFile),SERVICE='com.codebridge.transport',ACCOUNT='ngrok-authtoken';
const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(process.env.HOME||'', '.codebridge');
const FILE=path.join(APP_DIR,'transport-secret');
const useKeychain=!process.env.CODEBRIDGE_HOME;

export async function keychainAvailable(){
  if(!useKeychain)return false;
  try{await exec('/usr/bin/security',['find-generic-password','-s',SERVICE,'-a',ACCOUNT,'-w']);return true}catch{return false}
}

export async function readKeychainSecret(){
  if(useKeychain){try{const r=await exec('/usr/bin/security',['find-generic-password','-s',SERVICE,'-a',ACCOUNT,'-w']);const v=r.stdout.trim();if(v)return v}catch{}}
  try{return (await fsp.readFile(FILE,'utf8')).trim()||null}catch{return null}
}

export async function writeKeychainSecret(value){
  const v=String(value??'');
  if(useKeychain){try{await exec('/usr/bin/security',['add-generic-password','-U','-s',SERVICE,'-a',ACCOUNT,'-w',v]);return true}catch{}}
  await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});
  await fsp.writeFile(FILE,v,{mode:0o600});
  return true;
}

export async function deleteKeychainSecret(){
  if(useKeychain){try{await exec('/usr/bin/security',['delete-generic-password','-s',SERVICE,'-a',ACCOUNT])}catch{}}
  try{await fsp.rm(FILE,{force:true})}catch{}
}

export async function getOrCreateKeychainSecret(){
  const existing=await readKeychainSecret();
  if(existing)return existing;
  const value=crypto.randomBytes(32).toString('base64url');
  await writeKeychainSecret(value);
  return value;
}

export const keychainMode=useKeychain?'security-cli':'file';
