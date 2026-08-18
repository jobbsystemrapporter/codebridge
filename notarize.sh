#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; APP="$ROOT/dist/CodeBridge.app"; DMG="$ROOT/dist/CodeBridge-0.2.0-beta.1.dmg"
: "${CODEBRIDGE_DEVELOPER_ID:?Set CODEBRIDGE_DEVELOPER_ID to your Developer ID Application identity}"
: "${CODEBRIDGE_NOTARY_PROFILE:?Set CODEBRIDGE_NOTARY_PROFILE to an existing notarytool keychain profile}"
[[ -d "$APP" ]] || { echo 'Build CodeBridge.app first with ./release.sh' >&2; exit 1; }
codesign --force --deep --options runtime --timestamp --sign "$CODEBRIDGE_DEVELOPER_ID" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
"$ROOT/package-dmg.sh" >/dev/null
xcrun notarytool submit "$DMG" --keychain-profile "$CODEBRIDGE_NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"
spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG"
echo 'Developer ID signing + notarization PASS'
