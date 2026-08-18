import { getConfig,patchConfig,audit } from './core.mjs';

let listener=null;

export async function transportStatus(){
  const cfg=await getConfig();
  const url=String(cfg.chatgpt?.actionBaseUrl||'').trim();
  return {configured:!!cfg.transport?.ngrokConfigured,running:!!listener,url,runningUrl:listener?.url?.()||null};
}

export async function startTransport(authtoken){
  const token=String(authtoken||'').trim();
  if(!token)throw Object.assign(new Error('Paste the ngrok connection code from your ngrok account.'),{status:400});
  const ngrok=await import('@ngrok/ngrok');
  if(listener){try{await listener.close()}catch{}listener=null}
  try{
    const publicPort=Number(process.env.CODEBRIDGE_PUBLIC_PORT||4318);
    listener=await ngrok.forward({addr:publicPort,authtoken:token});
    const url=listener.url();
    if(!/^https:\/\//i.test(url))throw new Error('ngrok did not return a secure HTTPS address.');
    const cfg=await getConfig();
    await patchConfig({...cfg,transport:{...(cfg.transport||{}),provider:'ngrok',ngrokConfigured:true},chatgpt:{...(cfg.chatgpt||{}),actionBaseUrl:url,connected:false}});
    await audit('transport.started',{provider:'ngrok',host:new URL(url).host});
    return {ok:true,url};
  }catch(e){
    listener=null;
    throw Object.assign(new Error(`Could not start the secure connection: ${e.message}`),{status:400});
  }
}

export async function stopTransport(){if(listener){try{await listener.close()}finally{listener=null}}}
