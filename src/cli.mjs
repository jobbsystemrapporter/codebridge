import {doctor,getConfig,history,systemStatus} from './core.mjs';
const cmd=process.argv[2]||'status';
if(cmd==='doctor'){const d=await doctor();console.log('CodeBridge Doctor\n');for(const c of d.checks)console.log(`${c.ok?'✓':'○'} ${c.name}: ${c.detail}`);process.exit(d.healthy?0:1)}
if(cmd==='projects'){const c=await getConfig();console.log(c.allowedRoots.length?c.allowedRoots.join('\n'):'No project folders configured.');process.exit(0)}
if(cmd==='history'){for(const x of await history())console.log(`${x.at}  ${x.action}  ${x.path||x.command||''}`);process.exit(0)}
if(cmd==='status'){const s=await systemStatus();console.log(`CodeBridge ${s.version}\nComputer: ${s.hostname}\nMode: ${s.config.securityMode}\nProjects: ${s.config.allowedRoots.length}\nChatGPT: ${s.config.chatgpt?.connected?'connected':'not connected'}`);process.exit(0)}
console.error('Unknown command');process.exit(2);
