# Migrating from an existing local coding bridge

Do not remove the existing bridge first. CodeBridge is designed for side-by-side verification.

## Cutover gate

1. Install and launch CodeBridge.
2. Select one disposable Git project through the native folder picker.
3. Verify `doctor.mjs` reports local state as private and the app is healthy.
4. From the ChatGPT connector/GPT, call `open_workspace`. Confirm the response includes the project's `AGENTS.md` content.
5. Read a file, make a harmless edit, run `git status`, and review the diff.
6. Verify a non-safe command creates an approval dialog and does not execute before approval.
7. Verify worktree mode opens an isolated checkout.
8. Start a new ChatGPT conversation and repeat `open_workspace` to ensure project instructions arrive without relying on old chat state.
9. Only after these checks pass should the previous bridge be disabled. Keep its files/configuration for rollback until CodeBridge has been used successfully for several real tasks.

CodeBridge does not import credentials, logs, project lists, audit history or private configuration from another installation into a public build. User-specific state belongs under that user's local profile/Keychain.
