#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets"
mkdir -p "$OUT"

cat > /tmp/codebridge-icon.swift <<'SWIFT'
import AppKit
let outPath = CommandLine.arguments[1]
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
let rect = NSRect(origin: .zero, size: size)
let gradient = NSGradient(colors: [
  NSColor(calibratedRed: 0.11, green: 0.34, blue: 0.22, alpha: 1),
  NSColor(calibratedRed: 0.04, green: 0.13, blue: 0.09, alpha: 1)
])!
gradient.draw(in: rect, angle: -45)
NSColor(calibratedRed: 0.72, green: 0.96, blue: 0.78, alpha: 0.10).setFill()
let glow = NSBezierPath(roundedRect: NSRect(x: 110, y: 110, width: 804, height: 804), xRadius: 210, yRadius: 210)
glow.fill()
let attrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 400, weight: .bold),
  .foregroundColor: NSColor(calibratedRed: 0.76, green: 0.96, blue: 0.82, alpha: 1)
]
let text = NSAttributedString(string: "CB", attributes: attrs)
let tsize = text.size()
text.draw(at: NSPoint(x: (1024 - tsize.width) / 2, y: (1024 - tsize.height) / 2 - 18))
image.unlockFocus()
guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: outPath))
SWIFT

swift /tmp/codebridge-icon.swift "$OUT/CodeBridge-1024.png"

ICONSET="$OUT/CodeBridge.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for s in 16 32 64 128 256 512; do
  sips -z "$s" "$s" "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
done
sips -z 32 32 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 64 64 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_64x64@2x.png" >/dev/null
sips -z 256 256 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 512 512 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 1024 1024 "$OUT/CodeBridge-1024.png" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$OUT/CodeBridge.icns"
rm -rf "$ICONSET" /tmp/codebridge-icon.swift
echo "$OUT/CodeBridge.icns"
