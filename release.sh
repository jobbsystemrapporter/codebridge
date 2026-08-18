#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT"
TEST_HOME="$(mktemp -d "${TMPDIR:-/tmp}/codebridge-release.XXXXXX")"; trap 'rm -rf "$TEST_HOME"' EXIT; export CODEBRIDGE_HOME="$TEST_HOME/state"

echo '[1/13] Syntax + unit/security (isolated state)'; node --check server.mjs; node --check mcp.mjs; node test.mjs
echo '[2/13] Access-mode safety'; node access-mode-test.mjs
echo '[3/13] Clean first-run'; node first-run-test.mjs
echo '[4/13] DevSpace replacement contract'; node parity-test.mjs
echo '[5/13] DevSpace compatibility'; node compat-test.mjs
echo '[6/13] Custom GPT Action bridge'; node action-test.mjs
echo '[7/13] Privacy'; node privacy-check.mjs
echo '[8/13] Render UI (Vite + React + Tailwind v4)'; (cd ui && npm install --silent && npm run build)
echo '[9/13] Native helper (universal: arm64 + x86_64)'
(cd native-helper && swift build -c release --arch arm64 --scratch-path .build/arm64 && swift build -c release --arch x86_64 --scratch-path .build/x86_64)
mkdir -p native-helper/.build/release
lipo -create native-helper/.build/arm64/release/codebridge-helper native-helper/.build/x86_64/release/codebridge-helper -output native-helper/.build/release/codebridge-helper
lipo -archs native-helper/.build/release/codebridge-helper
echo '[10/13] Execution E2E (universal helper)'; CODEBRIDGE_HELPER="$PWD/native-helper/.build/release/codebridge-helper" node e2e.mjs
echo '[11/13] Native app (universal: arm64 + x86_64)'
(cd native && swift build -c release --arch arm64 --scratch-path .build/arm64 && swift build -c release --arch x86_64 --scratch-path .build/x86_64)
mkdir -p native/.build/release
lipo -create native/.build/arm64/release/CodeBridge native/.build/x86_64/release/CodeBridge -output native/.build/release/CodeBridge
lipo -archs native/.build/release/CodeBridge
echo '[12/13] Package'; ./package-app.sh; ./package-dmg.sh
echo '[13/13] Artifact verification'; node release-check.mjs
echo 'CodeBridge release gate PASS'
