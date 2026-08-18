# CodeBridge — binding project instructions

This file is the architectural contract for CodeBridge. Read it before every non-trivial change. If code, docs, tests, screenshots, or prior chat instructions conflict with this file, stop and reconcile the conflict before continuing.

## 1. Product goal — do not drift

CodeBridge exists for one primary goal:

> Let a non-technical Mac user code on explicitly selected local projects from a normal ChatGPT subscription, through a custom GPT, without paying for or configuring the OpenAI API as the model backend.

The target user should not need to understand MCP, REST, OpenAPI, bearer tokens, Node.js, shells, tunnels, PATH, ports, certificates, or developer tooling.

The intended experience is:

1. Download and open CodeBridge.
2. Choose project folder(s).
3. CodeBridge prepares the local bridge and secure public HTTPS transport.
4. CodeBridge walks the user through the minimum unavoidable ChatGPT UI steps with one action at a time and real screenshots where useful.
5. CodeBridge generates the custom GPT instructions, Action OpenAPI schema, and Action authentication secret for the user.
6. The user performs a simple connection test.
7. Only after an actual end-to-end Action call reaches this Mac may the app say Ready.
8. The user can then ask the custom GPT to inspect, edit, test, and work on allowed projects.

## 2. Canonical architecture

The ONLY local architecture reference is the Devspace reference checkout on the
developer machine. The absolute path is developer-local and must stay out of
the public repository and any shipped build.

Before changing the connection architecture, onboarding, action contract, auth model, workspace model, or command/file behavior, inspect the relevant Devspace files first. Do not substitute another local project as the reference.

Canonical data path:

```text
Normal ChatGPT subscription
        |
Custom GPT created/configured in ChatGPT
        |
GPT Action (OpenAPI)
        |
Bearer authentication using a per-install CodeBridge secret
        |
Public HTTPS transport
        |
CodeBridge local service on the user's Mac
        |
Explicit allowed-root / workspace security
        |
files + Git + safe command execution + approvals
```

ChatGPT is the agent/model. CodeBridge is the user's local tool bridge. The HTTPS provider is transport only.

## 3. Forbidden architecture for the normal user flow

Do NOT make any of these a requirement for normal CodeBridge use:

- `OPENAI_API_KEY`
- OpenAI API billing for model inference
- OpenAI Platform API keys as the AI/model credential
- OpenAI Secure MCP Tunnel
- `tunnel-client`
- `CONTROL_PLANE_API_KEY`
- OpenAI tunnel IDs such as `tunnel_...`
- OpenAI Runtime API keys
- SSH-MCP as the primary local connection architecture
- requiring the user to install Node.js
- requiring the user to use Terminal
- requiring the user to understand MCP

MCP may remain an optional developer/compatibility interface only if it does not complicate the normal product or onboarding. It must never silently become the primary ChatGPT connection path.

Any old code or documentation that implies the forbidden normal architecture is technical debt to remove, not a second supported onboarding path.

## 4. ChatGPT Actions requirements

The normal ChatGPT integration is a Custom GPT Action.

Current official OpenAI behavior to preserve:

- Actions are configured in the GPT editor.
- An Action needs authentication plus an OpenAPI schema.
- API-key authentication supports Bearer auth.
- The schema may be pasted into the editor or imported from a URL.
- Test the Action in GPT Preview / the configured GPT.
- A GPT can use apps or actions, not both simultaneously.
- Actions are not available while the GPT is using Pro mode; the editor exposes action-compatible non-Pro models.
- Workspace/domain policy can prevent Actions in managed Enterprise/Edu environments.
- A GPT shared publicly with Actions needs a valid Privacy Policy URL.

CodeBridge must generate the Action schema and GPT instructions itself. Users must never hand-author JSON/YAML.

The CodeBridge Action secret is NOT an OpenAI API key. It is a random per-install bearer credential whose only purpose is authenticating GPT Action requests to that user's CodeBridge instance. Never label it “OpenAI API key”. Never commit it, log it, show it in diagnostics, or send it anywhere except where the user explicitly configures Action authentication.

## 5. Public HTTPS transport

Devspace proves the required pattern: ChatGPT Action -> public HTTPS -> local bridge. CodeBridge must productize that transport for a beginner.

Preferred implementation direction: use ngrok as the initial transport because it matches the working Devspace architecture. Evaluate the official open-source `ngrok-javascript` SDK (`@ngrok/ngrok`) before relying on a separately installed CLI. It supports macOS arm64 and can embed ingress into a Node application. Its repository is dual MIT/Apache-2.0 licensed.

Important: ngrok service use still requires ngrok authorization/account setup. Do not confuse an ngrok authtoken with an OpenAI API key. Treat it as a transport credential and store it in Keychain/native secure storage, never repository config.

Do not redistribute the standalone ngrok Agent to users who use their own ngrok accounts unless the applicable ngrok terms explicitly permit that distribution model. The 2026 ngrok Terms distinguish redistribution under the distributor's account from customers using their own accounts. Prefer the open-source SDK or obtain/verify permission before shipping a standalone agent binary.

For the zero-knowledge onboarding goal, CodeBridge should eventually automate as much of this as legally and technically possible:

- detect whether transport is already configured;
- guide account authorization in a browser only when unavoidable;
- securely store transport credentials;
- start/restart the transport itself;
- discover its public HTTPS URL;
- generate the OpenAPI `servers` URL automatically;
- health-check the public endpoint;
- recover cleanly after Mac/app restart;
- never make the user paste a URL that CodeBridge can discover itself.

Do not hijack, modify, or stop an existing Devspace ngrok tunnel during development. CodeBridge must have isolated state and its own transport lifecycle.

## 6. Action surface

The Action API should stay small, understandable, and capability-oriented. At minimum it needs equivalents of:

- connection/health test;
- list allowed projects;
- list files;
- read file;
- write/edit file;
- Git status/inspection;
- run a command under CodeBridge policy;
- approval-aware behavior for higher-risk operations.

Never trust GPT instructions as a security boundary. Enforce allowed roots, canonical paths, sensitive-path blocks, command policy, capabilities, and approvals in CodeBridge Core/native code.

Read before edit. Never invent file contents. Prefer targeted edits. Project-specific `AGENTS.md`, `CLAUDE.md`, or equivalent instructions inside an allowed project should be surfaced to the GPT when opening that workspace, matching the proven Devspace behavior.

## 7. Beginner-first onboarding rules

Assume the user has no technical knowledge.

Every setup screen must answer exactly three questions:

1. What is happening?
2. What must I do right now?
3. How do I know it worked?

Rules:

- One primary action per screen/step.
- Do not show competing primary buttons.
- Do not expose technical diagnostics unless under an Advanced/Technical details disclosure.
- Do not use unexplained words such as MCP, endpoint, bearer, schema, runtime, PATH, localhost, or tunnel ID in beginner-facing copy.
- If the user must interact with ChatGPT/ngrok in a browser, show the exact UI step with a current real screenshot and clearly mark where to click.
- Never tell the user to “return and continue” without a visible Continue/Check button in CodeBridge.
- Back must return to the previous meaningful setup step, never unexpectedly restart onboarding.
- Persist completed setup state across app restarts.
- Never mark Ready based on local configuration alone. Ready requires a real authenticated GPT Action request reaching `/actions/health` (or its successor) from the configured GPT flow.
- Errors must explain the recovery action in plain language.

## 8. Security and privacy invariants

Each CodeBridge installation is isolated. A public build must contain none of the developer's:

- project paths;
- tokens/secrets;
- logs/history;
- tunnel/transport identifiers;
- GPT configuration;
- personal account data.

Keep deny-by-default project access. Only explicitly selected folders are accessible. Canonicalize/realpath before authorization. Protect sensitive locations even if requested. Use native approvals for risky commands. Keep developer shell compatibility disabled for ordinary users.

The public HTTPS endpoint must authenticate every privileged Action request. Never expose localhost control/admin APIs through the public Action surface merely because they share a process.

## 9. macOS distribution

The public product is a normal macOS app for non-developers. Users must not need Node.js, Swift, Homebrew, npm, or Terminal.

For distribution outside the Mac App Store, release builds must use Apple Developer ID signing and Apple notarization. Staple notarization tickets to distributable artifacts where applicable. Ad-hoc signing is development-only and is not sufficient for public release.

Do not claim the downloadable public beta is ready until a clean Mac/user test passes through Gatekeeper with the actual signed/notarized artifact.

## 10. External references allowed for facts, not architecture

Local architecture decisions come from the Devspace reference checkout only. Online sources may be used to verify current third-party requirements, APIs, licensing, packaging, or UI behavior.

Prefer first-party sources. Current reference set:

- OpenAI Help — Configuring actions in GPTs: https://help.openai.com/en/articles/9442513-gpt-actions-domain-settings-chatgpt-enterprise
- OpenAI Cookbook — GPT Actions examples: https://github.com/openai/openai-cookbook/tree/main/examples/chatgpt/gpt_actions_library
- OpenAI Cookbook — Bearer Action example: https://github.com/openai/openai-cookbook/blob/main/examples/chatgpt/gpt_actions_library/gpt_action_github.md
- ngrok official JavaScript SDK: https://github.com/ngrok/ngrok-javascript
- ngrok official docs repository: https://github.com/ngrok/ngrok-docs
- ngrok macOS setup/docs: https://ngrok.com/download/mac-os
- ngrok Terms of Service: https://ngrok.com/tos
- Apple macOS distribution: https://developer.apple.com/macos/distribution/
- Apple Developer ID: https://developer.apple.com/support/developer-id/
- Apple notarization workflow: https://developer.apple.com/documentation/security/customizing-the-notarization-workflow

Do not adopt code or architecture merely because a GitHub project looks useful. First verify that it serves the canonical Devspace-derived architecture, has an acceptable license, reduces beginner setup, and does not introduce OpenAI API billing or another model provider.

## 11. Known stale CodeBridge areas to clean up

As of 2026-08-18 the repository still contains remnants from the abandoned OpenAI Secure MCP Tunnel experiment, including files/tests/docs such as `tunnel.mjs`, `tunnel-install.mjs`, connector/tunnel tests, roadmap language, and security wording. These must be audited and removed or explicitly demoted to optional developer compatibility before release.

Do not preserve stale tunnel-client code merely because tests currently cover it. Tests must follow the product architecture, not freeze an abandoned architecture in place.

`ROADMAP.md`, `SECURITY.md`, release gates, onboarding text, tests, and packaging must all be reconciled with this file.

## 12. Definition of done

Do not say “done”, “ready”, or “release ready” until all applicable items pass:

1. No normal-user dependency on OpenAI API/runtime/tunnel credentials.
2. Fresh install starts with no developer-specific state.
3. User selects a project through native UI.
4. Public HTTPS transport is configured with beginner-safe guidance/automation.
5. CodeBridge generates the Custom GPT instructions, OpenAPI schema, and per-install bearer secret.
6. User can configure the GPT without Terminal or writing JSON/YAML manually.
7. A real Custom GPT Action reaches CodeBridge through public HTTPS with bearer authentication.
8. GPT can list the selected project, read a test file, perform an approved edit, inspect Git, and run a safe test command.
9. Disallowed paths and unauthenticated requests fail.
10. Restart CodeBridge/Mac and confirm setup resumes without starting over.
11. Existing Devspace remains untouched and functional.
12. Privacy/repository scan finds no personal paths, tokens, logs, or generated secrets.
13. All automated tests and release gates reflect the Custom GPT Action architecture.
14. Public artifact is Developer ID signed, notarized, stapled, and tested on a clean user account/Mac.
15. README/onboarding/support docs describe the same architecture as this file.

## 13. Required workflow for future agents

Before a non-trivial change:

1. Read this `AGENTS.md`.
2. Read the files to be changed.
3. If the change touches architecture/connection/onboarding, inspect the corresponding behavior in the Devspace reference checkout first.
4. If a third-party fact may have changed, verify it against a first-party source.
5. State briefly what is being changed and why.
6. Make the smallest coherent change.
7. Run relevant tests plus architecture guard checks.
8. Report exactly what passed, what failed, and what remains.

Before release, grep for forbidden normal-flow remnants such as `OPENAI_API_KEY`, `CONTROL_PLANE_API_KEY`, `tunnel-client`, `organization/tunnels`, and Runtime API key language. Any hit must be explained as optional developer compatibility or removed.

Never silently change the canonical architecture again.
