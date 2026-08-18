import{getConfig,saveConfig}from'./core.mjs';
export const ACCESS_MODES=['read-only','full-coding'];
export async function getAccessMode(){const cfg=await getConfig();return ACCESS_MODES.includes(cfg.accessMode)?cfg.accessMode:'read-only'}
export async function setAccessMode(mode){if(!ACCESS_MODES.includes(mode))throw Object.assign(new Error('Access mode must be read-only or full-coding.'),{status:400});const cfg=await getConfig();cfg.accessMode=mode;await saveConfig(cfg);return {accessMode:mode}}
export const readOnlyTools=new Set(['open_workspace','list_open_workspaces','list_projects','list_files','read_file','git_status','review_safe_workspace']);
export function toolAllowed(name,mode){return mode==='full-coding'||readOnlyTools.has(name)}
