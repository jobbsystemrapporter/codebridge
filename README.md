# CodeBridge

**Code with ChatGPT on local Mac projects without learning MCP or installing a developer stack.**

CodeBridge is a local macOS bridge between ChatGPT and folders you explicitly allow. It is designed for a simple flow: install CodeBridge, choose a project, connect ChatGPT, and work. Project files and local state remain on the user's Mac unless the user explicitly sends content through their ChatGPT workflow.

> Beta: the local app, Custom GPT Action bridge, workspace policy and execution chain are implemented and tested. CodeBridge does not use an OpenAI API key for the model: the user's normal ChatGPT plan supplies the model. Public distribution still requires a stable per-installation HTTPS transport and Apple Developer ID notarization.

## Current beta

- Universal native macOS app and DMG for Apple Silicon and Intel Macs, macOS 14+.
- Fully bundled runtime: Node.js and the ngrok transport binary are inside the app; users do not need Node.js, Homebrew, or an ngrok CLI.
- New renderer built with React, Radix UI and Tailwind CSS v4 (shadcn/ui-style components), adapted to the CodeBridge onboarding flow.
- Custom GPT Action bridge with generated OpenAPI schema and per-install Bearer authentication.
- Embedded ngrok HTTPS transport using the official JavaScript SDK; no ngrok CLI required for end users.
- Optional local HTTP MCP compatibility for developer clients; not part of normal ChatGPT onboarding.
- Explicit allowed projects through a native folder picker.
- `open_workspace` with AGENTS.md / CLAUDE.md project instructions.
- File list/read/write and Git inspection.
- Safe Git worktrees for isolated changes.
- Structured command execution through a native Swift helper without invoking a shell.
- Executable policy, filtered child environment and sensitive-path rules.
- Short-lived signed, single-use workspace capabilities.
- One-time native approval prompts for higher-risk commands.
- Local diagnostics, audit/history, privacy scanning and release gates.

## Security model

CodeBridge is deny-by-default around project access. Selecting one project does not grant access to the rest of the Mac. Security decisions are enforced by CodeBridge Core/native code rather than relying on instructions in a GPT prompt.

The normal structured-command path does not invoke a shell. A legacy/developer shell path exists for development compatibility and should remain disabled for ordinary users. Git worktrees provide workflow isolation, not OS-level confidentiality. See `SECURITY.md` for the exact boundary.

## Removing CodeBridge

In the app, open the "Start over" menu and choose either:

- **Erase all data & start fresh** – deletes all local CodeBridge state (configuration, project list, secrets, logs, workspaces) and returns to first-run setup.
- **Uninstall CodeBridge** – erases all state, removes the launch agent and moves `CodeBridge.app` to the Trash.

Your project folders are never modified or deleted by either option.

## Architecture

```text
ChatGPT subscription + custom GPT
   |
GPT Action (OpenAPI + Bearer auth)
   |
stable public HTTPS transport
   |
CodeBridge.app
   |-- explicit workspace policy
   |-- AGENTS.md / CLAUDE.md instructions
   |-- approvals + audit
   |-- signed one-use capabilities
   |-- native execution helper
   |-- Git worktrees
   `-- files / Git / commands
   |
User-selected projects
```

Each installation owns its own local state and credentials. A public CodeBridge build does not contain the developer's projects, paths, tokens, logs, tunnel IDs or configuration.

## Development

Requirements for building from source: macOS 14+, Apple Silicon, Node.js and Swift 6.

The web renderer lives in `ui/` (Vite + React + Tailwind CSS v4 + Radix UI). Build it with:

```sh
cd ui && npm install && npm run build
```

The build writes static assets to `public/`, which the local CodeBridge server serves unchanged.
To add real ChatGPT screenshots to the onboarding guide, drop them into
`ui/public/guide-images/` (filenames are documented in the README there).

```sh
node test.mjs
node compat-test.mjs
node connector-test.mjs
node privacy-check.mjs
```

Build the native components and all release artifacts with:

```sh
./release.sh
```

The release gate builds the Swift helper and app, runs execution E2E, packages the `.app` and DMG, verifies signatures/checksums, and runs the privacy scan.

## Public-release gates

Before the first downloadable public beta, maintainers must complete a real Custom GPT Action E2E test through the chosen public HTTPS transport and sign/notarize the application with an Apple Developer ID. No OpenAI API credential is part of the normal CodeBridge architecture.

See `MIGRATION.md`, `SECURITY.md`, `SUPPORT.md`, `CONTRIBUTING.md`, and `CHANGELOG.md`.

## Starta appen / How to run

Already packaged (no installs needed):

```sh
open dist/CodeBridge.app
```

or double-click `CodeBridge.app` in the `dist/` folder. To distribute, give
others the DMG (`dist/CodeBridge-0.2.0-beta.1.dmg`): they mount it, drag
`CodeBridge.app` to Applications, and open it. Until the app is Developer ID
signed and notarized, macOS may ask to right-click → Open once.
The DMG also contains `START-HERE.txt` – a complete step-by-step guide from
installation through ngrok, Custom GPT setup, connection test and usage.

Verify the local service is running:

```sh
curl http://127.0.0.1:4317/api/status
```

From source, after building the renderer and core:

```sh
npm start
```
