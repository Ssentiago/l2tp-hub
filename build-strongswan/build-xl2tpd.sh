#!/bin/bash
# Build xl2tpd universal binary (arm64 + x86_64) for macOS
# Run from project root: ./build-strongswan/build-xl2tpd.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
XL2TPD_SRC="$SCRIPT_DIR/xl2tpd"
PATCH_FILE="$SCRIPT_DIR/xl2tpd-macos.patch"
OUTPUT_DIR="$SCRIPT_DIR/universal-xl2tpd"

echo "=== Building xl2tpd universal binary ==="

# Apply patches if not already applied
cd "$XL2TPD_SRC"
if ! grep -q "STRLEN 512" file.h 2>/dev/null; then
    echo "Applying macOS patches..."
    git apply "$PATCH_FILE"
else
    echo "Patches already applied."
fi

# Build arm64
echo "Building arm64..."
make clean 2>/dev/null || true
make CC="cc -arch arm64" \
    LDFLAGS="-arch arm64 -mmacosx-version-min=13.0" \
    OSFLAGS="-DDARWIN" IPFLAGS="" \
    DFLAGS="-DDEBUG_PPPD -DTRUST_PPPD_TO_DIE" \
    xl2tpd
cp xl2tpd /tmp/xl2tpd-arm64

# Build x86_64
echo "Building x86_64..."
make clean 2>/dev/null || true
make CC="cc -arch x86_64" \
    LDFLAGS="-arch x86_64 -mmacosx-version-min=13.0" \
    OSFLAGS="-DDARWIN" IPFLAGS="" \
    DFLAGS="-DDEBUG_PPPD -DTRUST_PPPD_TO_DIE" \
    xl2tpd
cp xl2tpd /tmp/xl2tpd-x86_64

# Create universal binary
echo "Creating universal binary..."
mkdir -p "$OUTPUT_DIR"
lipo -create -output "$OUTPUT_DIR/xl2tpd" /tmp/xl2tpd-arm64 /tmp/xl2tpd-x86_64
codesign --force --sign - "$OUTPUT_DIR/xl2tpd"

echo "=== Done: $OUTPUT_DIR/xl2tpd ==="
file "$OUTPUT_DIR/xl2tpd"
