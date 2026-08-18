import { getConfig,patchConfig,audit } from './core.mjs';
import { readKeychainSecret,writeKeychainSecret } from './keychain.mjs';

let listener=null;

// ngrok hands out a random address unless a reserved domain is requested. A random
// one is fatal here: the custom GPT's Action schema hardcodes the address, so every
// restart would silently break the connection until the user pasted a new schema.
// ngrok's free tier includes one reserved domain, so this is a setting, not a plan
// upgrade.
const cleanDomain=v=>String(v||'').trim().replace(/^https?:\/\//i,'').replace(/\/+$/,'').toLowerCase();

export async function transportStatus(){
  const cfg=await getConfig();
  const url=String(cfg.chatgpt?.actionBaseUrl||'').trim();
  const domain=cleanDomain(cfg.transport?.domain);
  return {
    configured:!!cfg.transport?.ngrokConfigured,
    running:!!listener,
    url,
    runningUrl:listener?.url?.()||null,
    domain,
    stable:!!domain,
  };
}

export async function startTransport(authtoken,domain){
  let token=String(authtoken||'').trim();
  if(!token)token=(await readKeychainSecret())||'';
  if(!token)throw Object.assign(new Error('Paste the ngrok connection code from your ngrok account.'),{status:400});

  const cfg=await getConfig();
  // An explicit argument wins; otherwise reuse the domain from a previous run so
  // restarts keep the same address without the user re-entering anything.
  const raw=String((domain!==undefined?domain:cfg.transport?.domain)||'').trim();
  const wanted=cleanDomain(raw);
  // Something that normalises away to nothing ("http://") must not be read as
  // "no domain" — that would quietly hand the user an address that changes on
  // every restart, which is the failure this setting exists to prevent.
  if(raw&&!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(wanted))
    throw Object.assign(new Error('Enter the reserved domain only, for example example.ngrok-free.app'),{status:400});

  const ngrok=await import('@ngrok/ngrok');
  if(listener){try{await listener.close()}catch{}listener=null}
  try{
    const publicPort=Number(process.env.CODEBRIDGE_PUBLIC_PORT||4318);
    listener=await ngrok.forward({addr:publicPort,authtoken:token,...(wanted?{domain:wanted}:{})});
    const url=listener.url();
    if(!/^https:\/\//i.test(url))throw new Error('ngrok did not return a secure HTTPS address.');
    const previous=String(cfg.chatgpt?.actionBaseUrl||'').trim();
    // Keep the connected flag only when the address the GPT calls is unchanged.
    const sameAddress=previous&&previous===url;
    await patchConfig({...cfg,
      transport:{...(cfg.transport||{}),provider:'ngrok',ngrokConfigured:true,domain:wanted||undefined},
      chatgpt:{...(cfg.chatgpt||{}),actionBaseUrl:url,connected:sameAddress?!!cfg.chatgpt?.connected:false}});
    await audit('transport.started',{provider:'ngrok',host:new URL(url).host,stable:!!wanted,addressChanged:!sameAddress&&!!previous});
    await writeKeychainSecret(token).catch(()=>{});
    return {ok:true,url,stable:!!wanted,addressChanged:!!previous&&!sameAddress};
  }catch(e){
    listener=null;
    const msg=/not.*(found|authorized)|bind|reserve/i.test(String(e.message))&&wanted
      ? `ngrok would not use ${wanted}. Reserve it under Domains in your ngrok dashboard, on the same account as this connection code.`
      : `Could not start the secure connection: ${e.message}`;
    throw Object.assign(new Error(msg),{status:400});
  }
}

export async function stopTransport(){if(listener){try{await listener.close()}finally{listener=null}}}

export async function startTransportIfConfigured(){
  const cfg=await getConfig();
  if(!cfg.transport?.ngrokConfigured||listener)return false;
  try{await startTransport();return true}catch{return false}
}
