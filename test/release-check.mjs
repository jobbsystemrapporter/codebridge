import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const app = 'dist/CodeBridge.app';
const dmg = 'dist/CodeBridge-0.2.0-beta.4.dmg';
const checks = [];

async function c(name, fn, required = true) {
  try { await fn(); checks.push([name, true, required]) }
  catch (e) { checks.push([name, false, required, e.message]) }
}

async function universal(path) {
  const r = await exec('/usr/bin/lipo', ['-archs', path]);
  const archs = r.stdout.trim();
  if (!/arm64/.test(archs) || !/x86_64/.test(archs)) throw Error(`not universal: ${archs}`);
  return archs;
}

await c('App bundle', () => fs.access(app));
await c('Bundled Node runs (arm64)', async () => {
  const r = await exec(`${app}/Contents/Resources/runtime/bin/node`, ['--version']);
  if (!/^v\d+/.test(r.stdout)) throw Error('Node failed');
});
await c('Bundled Node universal', () => universal(`${app}/Contents/Resources/runtime/bin/node`));
await c('App binary universal', () => universal(`${app}/Contents/MacOS/CodeBridge`));
await c('Helper universal', () => universal(`${app}/Contents/Resources/Core/native-helper/.build/debug/codebridge-helper`));
await c('ngrok binaries bundled', async () => {
  await fs.access(`${app}/Contents/Resources/Core/node_modules/@ngrok/ngrok-darwin-arm64/ngrok.darwin-arm64.node`);
  await fs.access(`${app}/Contents/Resources/Core/node_modules/@ngrok/ngrok-darwin-x64/ngrok.darwin-x64.node`);
});
await c('Bundled Node runs (x86_64 slice via Rosetta)', async () => {
  const r = await exec('/usr/bin/arch', ['-x86_64', `${app}/Contents/Resources/runtime/bin/node`, '--version']);
  if (!/^v\d+/.test(r.stdout)) throw Error('Node x86_64 failed');
}, false);
await c('Code signature', () => exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]));
await c('Info.plist', () => exec('/usr/bin/plutil', ['-lint', `${app}/Contents/Info.plist`]));
await c('DMG', () => fs.access(dmg));
await c('DMG checksum', () => exec('/usr/bin/hdiutil', ['verify', dmg], { timeout: 60000 }));

for (const [x, ok, , e] of checks) console.log(`${ok ? '✓' : '○'} ${x}${e ? `: ${e}` : ''}`);
if (checks.some(([x, ok, required]) => required && !ok)) process.exit(1);
