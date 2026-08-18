import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile),SERVICE='com.codebridge.local',ACCOUNT='installation-secret';
// The `security` CLI can display modal Keychain UI when the login keychain is missing/locked.
// Core must never surprise users with OS dialogs, and automated tests must never touch real Keychain state.
export async function keychainAvailable(){return false}
export async function readKeychainSecret(){return null}
export async function writeKeychainSecret(){return false}
export async function getOrCreateKeychainSecret(){return crypto.randomBytes(32).toString('base64url')}
export const keychainMode='disabled-cli';
