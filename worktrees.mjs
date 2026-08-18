import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertAllowed,audit,APP_DIR } from './core.mjs';
const exec=promisify(execFile);
const BASE=path.join(APP_DIR,'worktrees');

async function git(cwd,args){return exec('git',args,{cwd,maxBuffer:4*1024*1024,timeout:120000})}
export async function createSafeWorkspace(project,baseRef='HEAD'){const root=await assertAllowed(project);await git(root,['rev-parse','--show-toplevel']);await git(root,['rev-parse','--verify',baseRef]);const id=crypto.randomBytes(5).toString('hex'),branch=`codebridge/${id}`,dest=path.join(BASE,id);await fsp.mkdir(BASE,{recursive:true,mode:0o700});await git(root,['worktree','add','-b',branch,dest,baseRef]);await audit('worktree.create',{project:root,path:dest,branch,id});return {id,path:dest,project:root,branch}}
export async function reviewSafeWorkspace(project,worktree){const root=await assertAllowed(project);const wt=path.resolve(worktree);if(!wt.startsWith(BASE+path.sep))throw Object.assign(new Error('Not a CodeBridge safe workspace.'),{status:403});const diff=await git(wt,['diff','HEAD','--']);const stat=await git(wt,['diff','--stat','HEAD','--']);const status=await git(wt,['status','--short']);return {project:root,worktree:wt,diff:diff.stdout,stat:stat.stdout,status:status.stdout}}
export async function discardSafeWorkspace(project,worktree){const root=await assertAllowed(project),wt=path.resolve(worktree);if(!wt.startsWith(BASE+path.sep))throw Object.assign(new Error('Not a CodeBridge safe workspace.'),{status:403});await git(root,['worktree','remove','--force',wt]);await audit('worktree.discard',{project:root,path:wt});return {ok:true}}
export async function applySafeWorkspace(project,worktree){const root=await assertAllowed(project),wt=path.resolve(worktree);if(!wt.startsWith(BASE+path.sep))throw Object.assign(new Error('Not a CodeBridge safe workspace.'),{status:403});const branch=(await git(wt,['branch','--show-current'])).stdout.trim();const dirty=(await git(wt,['status','--porcelain'])).stdout;if(dirty.trim())throw Object.assign(new Error('Review workspace has uncommitted changes. Commit them before applying.'),{status:409});await git(root,['merge','--ff-only',branch]);await git(root,['worktree','remove',wt]);await git(root,['branch','-d',branch]);await audit('worktree.apply',{project:root,path:wt,branch});return {ok:true,branch}}
export async function commitSafeWorkspace(project,worktree,message){const root=await assertAllowed(project),wt=path.resolve(worktree);if(!wt.startsWith(BASE+path.sep))throw Object.assign(new Error('Not a CodeBridge safe workspace.'),{status:403});const msg=String(message||'').trim();if(!msg)throw Object.assign(new Error('Commit message is required.'),{status:400});await git(wt,['add','-A']);await git(wt,['-c','user.name=CodeBridge','-c','user.email=codebridge@local','commit','-m',msg]);await audit('worktree.commit',{project:root,path:wt,message:msg});return {ok:true}}
