// The launchd agent is what gives CodeBridge the Devspace KeepAlive behaviour, so
// its job definition is worth pinning down. This validates the template and the
// substitution install.mjs performs, without loading anything into launchd.
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const root = process.cwd();
const template = await fsp.readFile(path.join(root, 'launchd', 'com.codebridge.app.plist'), 'utf8');

// A system Node must never be required: bundling Node is the reason users do not
// need Homebrew or a developer stack. Comments explain that rule, so judge the
// job itself rather than the prose around it.
const job_xml = template.replace(/<!--[\s\S]*?-->/g, '');
assert.ok(!/\/usr\/bin\/env/.test(job_xml), 'the agent must not resolve node through /usr/bin/env');
assert.ok(!/<string>node<\/string>/.test(job_xml), 'the agent must use an absolute node path');

const helper = path.join(root, 'native-helper', '.build', 'release', 'codebridge-helper');
const filled = template
  .replaceAll('__CODEBRIDGE_NODE__', process.execPath)
  .replaceAll('__CODEBRIDGE_ROOT__', root)
  .replaceAll('__CODEBRIDGE_HOME__', os.homedir())
  .replaceAll('__CODEBRIDGE_HELPER__', helper);

assert.ok(!/__CODEBRIDGE_[A-Z]+__/.test(filled), 'every placeholder must be substituted');

const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cb-agent-'));
const file = path.join(dir, 'com.codebridge.app.plist');
await fsp.writeFile(file, filled);

// plutil parses it the same way launchd will.
await exec('/usr/bin/plutil', ['-lint', file]);
const { stdout } = await exec('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file]);
const job = JSON.parse(stdout);

assert.equal(job.Label, 'com.codebridge.app');
assert.equal(job.KeepAlive, true, 'KeepAlive is the whole point: the bridge must survive a crash');
assert.equal(job.RunAtLoad, true, 'the bridge must come back after a restart without opening the app');
assert.equal(job.ProgramArguments[0], process.execPath);
assert.ok(path.isAbsolute(job.ProgramArguments[0]), 'node path must be absolute');
assert.equal(job.ProgramArguments[1], path.join(root, 'server.mjs'));
assert.equal(job.EnvironmentVariables.CODEBRIDGE_HELPER, helper);
assert.ok(job.EnvironmentVariables.PATH, 'a fixed PATH must be pinned for the service');

// The server the agent points at has to exist, or the job would crash-loop.
await fsp.access(path.join(root, 'server.mjs'));

await fsp.rm(dir, { recursive: true, force: true });
console.log('Launch agent job definition passed (absolute bundled node, KeepAlive, RunAtLoad, helper wired).');
