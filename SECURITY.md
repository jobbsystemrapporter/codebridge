# CodeBridge Security

## Security model

CodeBridge grants AI tools access only to folders explicitly selected by the user. Filesystem requests are canonicalized before authorization. Structured command execution uses a native helper, executable/argument policy, filtered environment and short-lived signed workspace capabilities. Capabilities are single-use. Commands outside the safe policy require an approval request; the desktop app presents an Allow once / Cancel decision.

The localhost control API uses a separate installation secret and origin checks. The public Custom GPT Action surface uses its own random per-install Bearer secret. The Action secret is a CodeBridge credential, not an OpenAI API key. Unauthenticated public Action requests are rejected.

The normal product does not require an OpenAI API key, OpenAI Runtime API key, or OpenAI Secure MCP Tunnel. Public HTTPS transport credentials are transport-only credentials and must never be committed, logged, bundled into releases, or forwarded to project commands.

## Transport isolation

CodeBridge owns its own HTTPS transport lifecycle and state. Development and release code must not stop, alter, or reuse an existing Devspace tunnel. The public transport must expose only the authenticated Action surface; localhost administration APIs are not a public API contract.

## Not a security boundary

Git worktrees protect workflow/review, not operating-system confidentiality. The current beta must not be described as a VM/container sandbox. Developer/legacy shell mode is intentionally more powerful and should remain off for normal users.

## Reporting

For a public release, configure a private GitHub Security Advisory contact before accepting external testers. Do not post credentials, private repository contents or exploit details in public issues.
