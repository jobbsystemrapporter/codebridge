// The public address must be stable. ngrok hands out a random one unless a
// reserved domain is requested, and the custom GPT's Action schema hardcodes
// whatever address it was set up with — so a random address silently breaks the
// connection on every restart.
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = await fsp.mkdtemp(path.join(os.tmpdir(), 'cb-transport-'));
process.env.CODEBRIDGE_HOME = home;

const { startTransport, transportStatus } = await import('../src/transport.mjs');
const { patchConfig, getConfig } = await import('../src/core.mjs');

// A malformed domain is rejected before any network call, with guidance rather
// than an ngrok stack trace.
for (const bad of ['not a domain', 'http://', 'example', 'foo/bar']) {
  await assert.rejects(
    () => startTransport('fake-token-for-validation', bad),
    /reserved domain only/,
    `${JSON.stringify(bad)} must be rejected`
  );
}

// Forms a user may reasonably paste are normalised, not rejected.
for (const good of ['example.ngrok-free.app', 'HTTPS://Example.Ngrok-Free.App/', ' example.ngrok-free.app ']) {
  await assert.rejects(
    () => startTransport('fake-token-for-validation', good),
    e => !/reserved domain only/.test(e.message),
    `${JSON.stringify(good)} must pass validation and fail later, at ngrok`
  );
}

// A stored domain is reported so the UI can tell the user whether their address
// survives a restart.
await patchConfig({ transport: { provider: 'ngrok', ngrokConfigured: true, domain: 'example.ngrok-free.app' } });
let status = await transportStatus();
assert.equal(status.domain, 'example.ngrok-free.app');
assert.equal(status.stable, true, 'a reserved domain means the address survives restarts');

await patchConfig({ transport: { provider: 'ngrok', ngrokConfigured: true, domain: undefined } });
status = await transportStatus();
assert.equal(status.stable, false, 'without a reserved domain the address is ephemeral');

// No token at all is a clear instruction, not a crash.
await patchConfig({ transport: {} });
await assert.rejects(() => startTransport('', ''), /connection code/);

await fsp.rm(home, { recursive: true, force: true });
console.log('Transport passed (reserved domain validated, persisted, and reported as stable).');
