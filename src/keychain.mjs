import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fsp from 'node:fs/promises';
import path from 'node:path';

const exec=promisify(execFile),SERVICE='com.codebridge.transport',ACCOUNT='ngrok-authtoken';
const APP_DIR=process.env.CODEBRIDGE_HOME?path.resolve(process.env.CODEBRIDGE_HOME):path.join(process.env.HOME||'', '.codebridge');
const FILE=path.join(APP_DIR,'transport-secret');
const isolated=!!process.env.CODEBRIDGE_HOME;

// /usr/bin/security speaks to the legacy file-based keychain. Recent macOS
// installs may have no login keychain at all — Apple moved to the data
// protection keychain — and then the tool pops a "default keychain could not be
// found" panel at the user before failing. Probe once and stay away from it
// entirely when there is nothing to write to, so the file fallback is silent.
let usable=null;
async function keychainUsable(){
  if(isolated)return false;
  if(usable!==null)return usable;
  try{await exec('/usr/bin/security',['default-keychain']);usable=true}
  catch{usable=false}
  return usable;
}

export async function keychainAvailable(){
  if(!(await keychainUsable()))return false;
  try{await exec('/usr/bin/security',['find-generic-password','-s',SERVICE,'-a',ACCOUNT,'-w']);return true}catch{return false}
}

export async function readKeychainSecret(){
  if(await keychainUsable()){
    try{const r=await exec('/usr/bin/security',['find-generic-password','-s',SERVICE,'-a',ACCOUNT,'-w']);const v=r.stdout.trim();if(v)return v}catch{}
  }
  try{return (await fsp.readFile(FILE,'utf8')).trim()||null}catch{return null}
}

export async function writeKeychainSecret(value){
  const v=String(value??'');
  if(await keychainUsable()){
    try{await exec('/usr/bin/security',['add-generic-password','-U','-s',SERVICE,'-a',ACCOUNT,'-w',v]);return true}catch{}
  }
  await fsp.mkdir(APP_DIR,{recursive:true,mode:0o700});
  await fsp.writeFile(FILE,v,{mode:0o600});
  return true;
}

export async function deleteKeychainSecret(){
  if(await keychainUsable()){
    try{await exec('/usr/bin/security',['delete-generic-password','-s',SERVICE,'-a',ACCOUNT])}catch{}
  }
  try{await fsp.rm(FILE,{force:true})}catch{}
}

export async function getOrCreateKeychainSecret(){
  const existing=await readKeychainSecret();
  if(existing)return existing;
  const value=crypto.randomBytes(32).toString('base64url');
  await writeKeychainSecret(value);
  return value;
}

/** Where the transport credential actually ended up, for diagnostics. */
export async function keychainModeNow(){
  if(isolated)return 'file';
  return (await keychainUsable())?'security-cli':'file';
}

export const keychainMode=isolated?'file':'security-cli';
