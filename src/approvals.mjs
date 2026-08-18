import crypto from 'node:crypto';
const pending=new Map();
const decided=new Map();
function sweep(){const now=Date.now();for(const [id,a] of pending)if(a.expiresAt<now)pending.delete(id);for(const [id,a] of decided)if(a.expiresAt<now)decided.delete(id)}

// A decision authorizes one exact command. `req` holds the request as the caller
// phrased it, so a retry that reuses the approvalId with different values is
// rejected instead of inheriting someone else's approval.
export function fingerprint(r={}){return JSON.stringify({cwd:String(r.cwd??''),executable:String(r.executable??''),args:(r.args||[]).map(String),command:String(r.command??'')})}

export function requestApproval(action){sweep();const id=crypto.randomUUID(),createdAt=Date.now(),expiresAt=createdAt+5*60_000;const item={id,createdAt,expiresAt,status:'pending',...action,req:fingerprint(action.req||action)};pending.set(id,item);return item}
export function listApprovals(){sweep();return [...pending.values()].sort((a,b)=>a.createdAt-b.createdAt)}
export function decideApproval(id,allow){sweep();const item=pending.get(id);if(!item)throw Object.assign(new Error('Approval request not found or expired.'),{status:404});pending.delete(id);const result={...item,status:allow?'approved':'denied',decidedAt:Date.now(),expiresAt:Date.now()+60_000};decided.set(id,result);return result}

// `expected` is the command the caller wants to run now. It must match the one the
// user actually saw and approved, or the decision is burned and refused.
export function consumeDecision(id,expected){sweep();const d=decided.get(id);if(!d)return null;decided.delete(id);if(expected!==undefined&&d.req!==fingerprint(expected))throw Object.assign(new Error('This approval was granted for a different command.'),{status:403});return d}
