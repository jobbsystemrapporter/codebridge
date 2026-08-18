import crypto from 'node:crypto';
const pending=new Map();
const decided=new Map();
function sweep(){const now=Date.now();for(const [id,a] of pending)if(a.expiresAt<now)pending.delete(id);for(const [id,a] of decided)if(a.expiresAt<now)decided.delete(id)}
export function requestApproval(action){sweep();const id=crypto.randomUUID(),createdAt=Date.now(),expiresAt=createdAt+5*60_000;const item={id,createdAt,expiresAt,status:'pending',...action};pending.set(id,item);return item}
export function listApprovals(){sweep();return [...pending.values()].sort((a,b)=>a.createdAt-b.createdAt)}
export function decideApproval(id,allow){sweep();const item=pending.get(id);if(!item)throw Object.assign(new Error('Approval request not found or expired.'),{status:404});pending.delete(id);const result={...item,status:allow?'approved':'denied',decidedAt:Date.now(),expiresAt:Date.now()+60_000};decided.set(id,result);return result}
export function consumeDecision(id){sweep();const d=decided.get(id);if(!d)return null;decided.delete(id);return d}
