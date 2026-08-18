const used=new Map();
function sweep(){const now=Date.now();for(const [n,exp] of used)if(exp<now)used.delete(n)}
export function consumeNonce(nonce,exp){sweep();if(typeof nonce!=='string'||nonce.length<8)return false;if(used.has(nonce))return false;used.set(nonce,exp);return true}
export function replayCacheSize(){sweep();return used.size}
