export const parity=[
{id:'status',devspace:'devspace-status',codebridge:'doctor + /api/status',required:true},
{id:'open',devspace:'open_workspace',codebridge:'open_workspace',required:true},
{id:'instructions',devspace:'AGENTS.md bridge injection',codebridge:'AGENTS.md / CLAUDE.md discovery',required:true},
{id:'files',devspace:'list/read/write/edit',codebridge:'list_files/read_file/write_file',required:true},
{id:'commands',devspace:'bash',codebridge:'structured run_command + approval',required:true},
{id:'remote',devspace:'ngrok bridge',codebridge:'Custom GPT Action + ngrok transport',required:true},
{id:'autostart',devspace:'launchd KeepAlive',codebridge:'launchd KeepAlive agent installed and loaded by the app',required:true},
{id:'context',devspace:'optional VS Code context route',codebridge:'not in beta scope',required:false},
{id:'subagents',devspace:'Codex/Claude/OpenCode/etc SDK runners',codebridge:'not in beta scope',required:false}
];
export function requiredParity(){return parity.filter(x=>x.required)}
