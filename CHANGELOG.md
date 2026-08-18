# Changelog

## 0.2.0-beta.2

- Reserved ngrok domain support, so the public address survives restarts. Without one the address changed every time CodeBridge started and the custom GPT silently stopped reaching the Mac.
- Fixed three critical security issues: the executable allowlist could be bypassed with a path, approvals were not bound to the command shown, and `/mcp` plus `/api/session` were reachable without the local token. Regression tests cover all three.
- The app installs and loads its own launchd agent, so the bridge survives quitting the app and restarting the Mac.
- Repository restructured into `src/`, `test/` and `scripts/`; test and gate scripts no longer ship inside the app bundle.
- Renderer rebuilt on the stock shadcn/ui neutral dark theme, dark only.

- Redesigned renderer built on React 19, Radix UI, Tailwind CSS v4 and shadcn/ui-style components, adapted to the CodeBridge onboarding flow.
- Public HTTPS surface now exposes only authenticated `/actions/*`; admin API, MCP and the UI stay on localhost.
- In-app lifecycle controls: "Erase all data & start fresh" wipes all local CodeBridge state, and "Uninstall CodeBridge" wipes state, removes the launch agent and moves the app to the Trash. Project files are never touched.
- GPT Action flow now supports `openWorkspace` (surfaces AGENTS.md/CLAUDE.md) and structured `runCommand` with a real approval round-trip; developer mode runs safe commands without approval.
- ngrok connection code is stored in Keychain (file fallback in dev) and the transport auto-reconnects on app start.
- App icon, guided commit inside Safe Workspaces, GitHub Actions CI, optional real-screenshot slots in the ChatGPT guide, and a Privacy Policy URL field.
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
