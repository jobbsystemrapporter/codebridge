#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
APP="$OUT/CodeBridge.app"
BIN="$ROOT/native/.build/release/CodeBridge"
HELPER="$ROOT/native-helper/.build/release/codebridge-helper"
CORE="$APP/Contents/Resources/Core"
RUNTIME="$APP/Contents/Resources/runtime"
NODE_VERSION="${CODEBRIDGE_NODE_VERSION:-22.22.3}"
CACHE="${CODEBRIDGE_RUNTIME_CACHE:-$ROOT/.runtime-cache}"
NGROK_VERSION="$(node -e "console.log(require('./node_modules/@ngrok/ngrok/package.json').version)")"

echo "==> Verifying universal binaries (arm64 + x86_64)"
for f in "$BIN" "$HELPER"; do
  [[ -f "$f" ]] || { echo "Missing: $f — build universal binaries first with ./release.sh" >&2; exit 1; }
  archs="$(lipo -archs "$f")"
  [[ "$archs" == *arm64* && "$archs" == *x86_64* ]] || { echo "Not universal: $f ($archs)" >&2; exit 1; }
done

echo "==> Staging app bundle"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$CORE/native-helper/.build/debug" "$RUNTIME/bin"
cp "$BIN" "$APP/Contents/MacOS/CodeBridge"
cp "$HELPER" "$CORE/native-helper/.build/debug/codebridge-helper"

echo "==> Bundling universal Node runtime (v${NODE_VERSION})"
NODE_BIN="$RUNTIME/bin/node"
if [[ -n "${CODEBRIDGE_NODE_UNIVERSAL:-}" && -f "$CODEBRIDGE_NODE_UNIVERSAL" ]]; then
  cp "$CODEBRIDGE_NODE_UNIVERSAL" "$NODE_BIN"
else
  NODE_CACHE="$CACHE/node-v$NODE_VERSION"
  for a in arm64 x64; do
    TGZ="$NODE_CACHE/node-v$NODE_VERSION-darwin-$a.tar.gz"
    DIR="$NODE_CACHE/darwin-$a"
    if [[ ! -f "$TGZ" ]]; then
      echo "    downloading Node v$NODE_VERSION ($a)"
      mkdir -p "$NODE_CACHE"
      curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-darwin-$a.tar.gz" -o "$TGZ"
    fi
    if [[ ! -x "$DIR/bin/node" ]]; then
      rm -rf "$DIR"
      mkdir -p "$DIR"
      tar -xzf "$TGZ" -C "$DIR" --strip-components=1
    fi
  done
  lipo -create "$NODE_CACHE/darwin-arm64/bin/node" "$NODE_CACHE/darwin-x64/bin/node" -output "$NODE_BIN"
fi
chmod +x "$NODE_BIN"
NODE_ARCHS="$(lipo -archs "$NODE_BIN")"
echo "    node slices: $NODE_ARCHS"
[[ "$NODE_ARCHS" == *arm64* && "$NODE_ARCHS" == *x86_64* ]] || { echo "Bundled Node is not universal" >&2; exit 1; }
"$NODE_BIN" --version >/dev/null

echo "==> Bundling CodeBridge Core"
# Only the modules the app actually runs. Test and gate scripts stay out of the
# bundle: users have no use for them and they widen the attack surface.
cp "$ROOT"/src/*.mjs "$CORE/"
cp "$ROOT/package.json" "$ROOT/package-lock.json" "$CORE/"
cp -R "$ROOT/src/public" "$CORE/public"
cp "$ROOT/assets/CodeBridge.icns" "$APP/Contents/Resources/CodeBridge.icns"

echo "==> Bundling ngrok SDK for both architectures"
NGROK_STAGE="$CORE/node_modules/@ngrok"
mkdir -p "$NGROK_STAGE"
cp -R "$ROOT/node_modules/@ngrok/ngrok" "$NGROK_STAGE/ngrok"
for pkg in ngrok-darwin-arm64 ngrok-darwin-x64; do
  SRC="$ROOT/node_modules/@ngrok/$pkg"
  if [[ ! -d "$SRC" ]]; then
    echo "    fetching missing $pkg@$NGROK_VERSION"
    PKG_CACHE="$CACHE/npm-$pkg"
    mkdir -p "$PKG_CACHE"
    ( cd "$PKG_CACHE" && npm pack "@ngrok/$pkg@$NGROK_VERSION" --silent >/dev/null )
    TGZ="$(ls "$PKG_CACHE"/*.tgz | head -1)"
    rm -rf "$PKG_CACHE/extract"
    mkdir -p "$PKG_CACHE/extract"
    tar -xzf "$TGZ" -C "$PKG_CACHE/extract"
    SRC="$PKG_CACHE/extract/package"
  fi
  ls "$SRC"/*.node >/dev/null 2>&1 || { echo "ngrok binary missing for $pkg" >&2; exit 1; }
  cp -R "$SRC" "$NGROK_STAGE/$pkg"
done
ls "$NGROK_STAGE"/ngrok-darwin-*/*.node

echo "==> Writing Info.plist"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.codebridge.app</string>
<key>CFBundleName</key><string>CodeBridge</string><key>CFBundleDisplayName</key><string>CodeBridge</string>
<key>CFBundleExecutable</key><string>CodeBridge</string><key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>CodeBridge</string>
<key>CFBundleShortVersionString</key><string>0.2.0-beta.3</string><key>CFBundleVersion</key><string>4</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>CodeBridgeRoot</key><string>Contents/Resources/Core</string>
<key>CodeBridgeNode</key><string>Contents/Resources/runtime/bin/node</string>
</dict></plist>
PLIST

echo "==> Ad-hoc signing"
strip -S "$APP/Contents/MacOS/CodeBridge" "$CORE/native-helper/.build/debug/codebridge-helper" 2>/dev/null || true
codesign --force --deep --sign - "$APP"
echo "$APP"
