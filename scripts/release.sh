#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
TEST_HOME="$(mktemp -d "${TMPDIR:-/tmp}/codebridge-release.XXXXXX")"; trap 'rm -rf "$TEST_HOME"' EXIT; export CODEBRIDGE_HOME="$TEST_HOME/state"

echo '[1/13] Native helper (universal: arm64 + x86_64)'
(cd native-helper && swift build -c release --arch arm64 --scratch-path .build/arm64 && swift build -c release --arch x86_64 --scratch-path .build/x86_64)
mkdir -p native-helper/.build/release
lipo -create native-helper/.build/arm64/release/codebridge-helper native-helper/.build/x86_64/release/codebridge-helper -output native-helper/.build/release/codebridge-helper
lipo -archs native-helper/.build/release/codebridge-helper
export CODEBRIDGE_HELPER="$PWD/native-helper/.build/release/codebridge-helper"
echo '[2/13] Syntax + unit/security (isolated state)'; node --check src/server.mjs; node --check src/mcp.mjs; node test/test.mjs; node test/reset-test.mjs; node test/security-regression-test.mjs; node test/launchagent-test.mjs; node test/transport-test.mjs
echo '[3/13] Access-mode safety'; node test/access-mode-test.mjs
echo '[4/13] Clean first-run'; node test/first-run-test.mjs
echo '[5/13] DevSpace replacement contract'; node test/parity-test.mjs
echo '[6/13] DevSpace compatibility'; node test/compat-test.mjs
echo '[7/13] Custom GPT Action bridge'; node test/action-test.mjs
echo '[8/13] Privacy'; node test/privacy-check.mjs
echo '[9/13] Render UI (Vite + React + Tailwind v4)'; (cd ui && npm install --silent && npm run build)
echo '[10/13] Execution E2E (universal helper)'; node test/e2e.mjs
echo '[11/13] Native app (universal: arm64 + x86_64)'
(cd native && swift build -c release --arch arm64 --scratch-path .build/arm64 && swift build -c release --arch x86_64 --scratch-path .build/x86_64)
mkdir -p native/.build/release
lipo -create native/.build/arm64/release/CodeBridge native/.build/x86_64/release/CodeBridge -output native/.build/release/CodeBridge
lipo -archs native/.build/release/CodeBridge
echo '[12/13] Package'; ./scripts/package-app.sh; ./scripts/package-dmg.sh
echo '[13/13] Artifact verification'; node test/release-check.mjs
echo 'CodeBridge release gate PASS'
