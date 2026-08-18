# CodeBridge roadmap

`AGENTS.md` is the binding architecture contract. The Devspace reference checkout is the only local architecture reference.

## Implemented

- Universal native macOS app (Apple Silicon + Intel) with fully bundled Node runtime and ngrok binaries.
- Deny-by-default project selection and path enforcement.
- File, Git, command, approval and safe-workspace capabilities.
- Custom GPT Action API with per-install Bearer authentication.
- Generated GPT instructions and OpenAPI schema.
- Real connection state only after an authenticated Action health call reaches this Mac.
- Official ngrok JavaScript SDK integrated as the public HTTPS transport layer.
- Beginner onboarding that starts ngrok from inside CodeBridge rather than asking the user to install a CLI or paste a public URL.
- Optional local MCP compatibility kept separate from the normal ChatGPT flow.

## Before public beta

1. Complete a real-account clean-user E2E: ngrok account -> Custom GPT Action -> CodeBridge -> selected project.
2. Replace remaining developer-oriented GPT editor copy with current screenshots and one-action-at-a-time guidance.
3. Persist/recover the ngrok transport credential using native Keychain support without exposing it to the web UI or logs.
4. Confirm transport automatically reconnects after CodeBridge/Mac restart.
5. Remove all abandoned OpenAI Secure MCP Tunnel source/tests/docs.
6. Run privacy scans on the packaged artifact and verify no developer state or credentials ship.
7. Test the DMG on a clean macOS user/Mac, including the one-time Gatekeeper approval for a standalone app.
8. Publish only after the full release gate and real Custom GPT Action E2E pass.

## Product invariant

The normal CodeBridge experience uses the user's normal ChatGPT subscription and a Custom GPT Action. It does not use an OpenAI API key for model inference and does not require OpenAI Secure MCP Tunnel or Runtime API keys.
