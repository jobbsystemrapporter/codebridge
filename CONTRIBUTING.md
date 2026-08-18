# Contributing to CodeBridge

CodeBridge is security-sensitive software. Keep changes small, testable and explicit.

## Development

- Node.js 22+ and Swift 6 on macOS 14+.
- Run `npm test` for the core, Action bridge, security-regression and launch-agent suites.
- Universal release binaries (arm64 + x86_64) are produced by `./scripts/release.sh`. To build manually, build each architecture with `swift build -c release --arch arm64 --scratch-path .build/arm64` (and the same with `x86_64`) and combine with `lipo -create`.
- Run `CODEBRIDGE_HELPER="$PWD/native-helper/.build/release/codebridge-helper" node e2e.mjs`.
- Build the desktop shell in `native/` with `swift build -c release --disable-sandbox`.

## Security rules

Do not weaken allowed-root checks, capability verification, localhost authentication, command approvals, executable policy or credential filtering for convenience. New execution capabilities require tests for denial and tampering as well as the success path.

Do not include secrets, signing credentials, OpenAI runtime credentials or developer certificates in commits.
