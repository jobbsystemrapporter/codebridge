// Installs the launchd agent for a source/development checkout.
//
// End users never run this: the packaged app installs and bootstraps the same job
// itself from LaunchAgent.swift, using the Node runtime inside the bundle.
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = process.env.CODEBRIDGE_HELPER || path.join(root, 'native-helper', '.build', 'release', 'codebridge-helper');
const template = await fsp.readFile(path.join(root, 'launchd', 'com.codebridge.app.plist'), 'utf8');
const dst = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.codebridge.app.plist');

await fsp.mkdir(path.dirname(dst), { recursive: true });
await fsp.writeFile(dst, template
  .replaceAll('__CODEBRIDGE_NODE__', process.execPath)
  .replaceAll('__CODEBRIDGE_ROOT__', path.join(root, 'src'))
  .replaceAll('__CODEBRIDGE_HOME__', os.homedir())
  .replaceAll('__CODEBRIDGE_HELPER__', helper));

const domain = `gui/${process.getuid()}`;
try { await exec('/bin/launchctl', ['bootout', `${domain}/com.codebridge.app`]) } catch {}
await exec('/bin/launchctl', ['bootstrap', domain, dst]);

console.log(`Installed and loaded launch agent: ${dst}`);
console.log(`Node: ${process.execPath}`);
console.log(`Remove it with: launchctl bootout ${domain}/com.codebridge.app && rm ${dst}`);
