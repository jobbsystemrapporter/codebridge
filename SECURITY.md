# CodeBridge Security

## Security model

CodeBridge grants AI tools access only to folders explicitly selected by the user. Filesystem requests are canonicalized before authorization. Structured command execution uses a native helper, executable/argument policy, filtered environment and short-lived signed workspace capabilities. Executables must be bare command names; a name carrying a path is rejected by both CodeBridge Core and the native helper. Capabilities carry a single-use nonce, but the helper currently verifies signature, expiry and command binding only — replay within the capability's short TTL is not yet rejected. Commands outside the safe policy require an approval request; the desktop app presents an Allow once / Cancel decision, and an approval authorizes only the exact command the user was shown.

The localhost control API pins the Host header to the loopback address it listens on, so DNS rebinding from a web page cannot reach it. The optional local MCP surface requires the same installation secret as the rest of the control API.

The localhost control API uses a separate installation secret and origin checks. The public Custom GPT Action surface uses its own random per-install Bearer secret. The Action secret is a CodeBridge credential, not an OpenAI API key. Unauthenticated public Action requests are rejected.

The normal product does not require an OpenAI API key, OpenAI Runtime API key, or OpenAI Secure MCP Tunnel. Public HTTPS transport credentials are transport-only credentials and must never be committed, logged, bundled into releases, or forwarded to project commands. The transport credential is stored in the macOS Keychain when a login keychain exists. Recent macOS installs may have none — `security` speaks to the legacy keychain — and CodeBridge then stores it in `~/.codebridge/transport-secret` with mode 0600 instead of prompting. Moving this to the data protection keychain is open work.

## Transport isolation

CodeBridge owns its own HTTPS transport lifecycle and state. Development and release code must not stop, alter, or reuse an existing Devspace tunnel. The public transport must expose only the authenticated Action surface; localhost administration APIs are not a public API contract.

## Not a security boundary

Git worktrees protect workflow/review, not operating-system confidentiality. The current beta must not be described as a VM/container sandbox. Developer/legacy shell mode is intentionally more powerful and should remain off for normal users.

## Reporting

Report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. Do not post credentials, private repository contents or exploit details in public issues.
