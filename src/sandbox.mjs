import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);

// macOS sandbox-exec is deprecated by Apple but remains useful as an optional
// defence-in-depth layer while CodeBridge moves toward a hardened helper/app sandbox.
export async function sandboxCapabilities(){
  if(process.platform!=='darwin') return {available:false,kind:'none',detail:'OS sandbox helper not implemented on this platform.'};
  try{await exec('/usr/bin/sandbox-exec',['-h']);return {available:true,kind:'sandbox-exec',detail:'Optional macOS process containment available (deprecated API).'}}catch{return {available:false,kind:'none',detail:'sandbox-exec unavailable; approval policy only.'}}
}
export function macProfile(workspace){
  const w=path.resolve(workspace).replaceAll('"','\\"');
  const tmp=path.resolve(os.tmpdir()).replaceAll('"','\\"');
  return `(version 1)\n(deny default)\n(import "system.sb")\n(allow process*)\n(allow sysctl-read)\n(allow file-read* (subpath "/System") (subpath "/usr") (subpath "/bin") (subpath "/opt/homebrew") (subpath "${w}"))\n(allow file-write* (subpath "${w}") (subpath "${tmp}"))\n(allow network-outbound)\n`;
}
