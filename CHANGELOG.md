# Changelog

## 0.2.0-beta.2 (unreleased)

- Redesigned renderer built on React 19, Radix UI, Tailwind CSS v4 and shadcn/ui-style components, adapted to the CodeBridge onboarding flow.
- Public HTTPS surface now exposes only authenticated `/actions/*`; admin API, MCP and the UI stay on localhost.
- Universal app and DMG: works on both Apple Silicon and Intel Macs.
- Bundled official Node.js v22 runtime for both architectures; no Homebrew/Node dependency on the user's Mac.
- Bundled ngrok native binaries for arm64 and x86_64 inside the app.
- Release gate now verifies universal binary slices and bundled ngrok binaries.

## 0.2.0-beta.1

- Native macOS application and DMG packaging.
- Bundled Node runtime; no separate Node installation required for packaged app.
- Local HTTP MCP server with session lifecycle compatible with connector-style clients.
- Explicit allowed-project access and native folder picker.
- `open_workspace` with AGENTS.md / CLAUDE.md discovery.
- Safe Git worktrees.
- Structured command execution through a native Swift helper without a shell.
- Short-lived signed, single-use workspace capabilities.
- Native one-time approval flow for higher-risk commands.
- Local audit/history, doctor checks and privacy release scan.
- CI coverage for core, connector handshake, DevSpace compatibility and E2E execution.
