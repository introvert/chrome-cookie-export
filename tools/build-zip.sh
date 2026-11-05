#!/usr/bin/env bash
# Package the extension into dist/cookie-export-<version>.zip
# (only the files Chrome needs; ready for "Load unpacked" or the Web Store).
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/cookie-export-${version}.zip"
mkdir -p dist
rm -f "$out"
zip -X -r "$out" manifest.json popup.html popup.css popup.js icons/*.png >/dev/null
echo "$out"
