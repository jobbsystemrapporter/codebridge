#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; OUT="$ROOT/dist"; APP="$OUT/CodeBridge.app"; DMG="$OUT/CodeBridge-0.2.0-beta.1.dmg"; STAGE="$OUT/dmg-stage"
[[ -d "$APP" ]] || "$ROOT/package-app.sh" >/dev/null
rm -rf "$STAGE" "$DMG"; mkdir -p "$STAGE"; cp -R "$APP" "$STAGE/"; ln -s /Applications "$STAGE/Applications"
cp "$ROOT/START-HERE.txt" "$STAGE/START-HERE.txt"
hdiutil create -volname "CodeBridge" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
echo "$DMG"
