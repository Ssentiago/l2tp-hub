#!/bin/bash
# =============================================================================
# build.sh — Сборка universal бинарников strongSwan + xl2tpd для macOS
# =============================================================================
# Скачивает pinned версии зависимостей, собирает universal (arm64+x86_64),
# копирует результат в src-tauri/resources/.
#
# Использование:
#   ./build.sh              — полная сборка
#   ./build.sh --skip-ssl   — пропустить OpenSSL (если уже собран)
#   ./build.sh --clean      — удалить всё кроме скриптов и патчей
#   ./build.sh --verbose    — показывать вывод всех команд
#
# Требования: macOS 13+, Xcode Command Line Tools
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Pinned версии зависимостей — МЕНЯТЬ ЗДЕСЬ при обновлении
# ---------------------------------------------------------------------------
OPENSSL_VERSION="3.6.3"
OPENSSL_SHA256="243a86649cf6f23eeb6a2ff2456e09e5d77dd9018a54d3d96b0c6bdd6ba6c7f1"
OPENSSL_URL="https://github.com/openssl/openssl/releases/download/openssl-${OPENSSL_VERSION}/openssl-${OPENSSL_VERSION}.tar.gz"

STRONGSWAN_VERSION="6.0.7"
STRONGSWAN_SHA256="e518e34e159514f4c6ba80d1f926cb151e0dd4e3a1d94213171234b8b9ae6f55"
STRONGSWAN_URL="https://download.strongswan.org/strongswan-${STRONGSWAN_VERSION}.tar.bz2"

XL2TPD_REPO="https://github.com/xelerance/xl2tpd.git"
XL2TPD_COMMIT="d391292"  # v1.3.20

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build-strongswan"
RESOURCES_DIR="$SCRIPT_DIR/src-tauri/resources"
LOG_FILE="$BUILD_DIR/build.log"

OPENSSL_SRC="$BUILD_DIR/openssl-${OPENSSL_VERSION}"
STRONGSWAN_SRC="$BUILD_DIR/strongswan-${STRONGSWAN_VERSION}"
XL2TPD_SRC="$BUILD_DIR/xl2tpd"

OPENSSL_PREFIX="$BUILD_DIR/openssl-universal"

MIN_MACOS="13.0"

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
SKIP_SSL=false
CLEAN=false
VERBOSE=false
for arg in "$@"; do
    case "$arg" in
        --skip-ssl) SKIP_SSL=true ;;
        --clean) CLEAN=true ;;
        --verbose) VERBOSE=true ;;
    esac
done

# Output redirection: --verbose shows everything, default swallows to log
if [ "$VERBOSE" = true ]; then
    REDIRECT=""
else
    REDIRECT=">> \"$LOG_FILE\" 2>&1"
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step() {
    echo ""
    echo "  ▸ $1"
}

ok() {
    echo "  ✓ $1"
}

warn() {
    echo "  ⚠ $1"
}

fail() {
    echo "  ✗ $1"
    exit 1
}

download() {
    local url="$1"
    local dest="$2"
    local sha256="$3"
    local name
    name=$(basename "$dest")

    if [ -f "$dest" ]; then
        local actual
        actual=$(shasum -a 256 "$dest" | awk '{print $1}')
        if [ "$actual" = "$sha256" ]; then
            ok "$name cached (checksum matches)"
            return 0
        else
            warn "$name checksum mismatch, re-downloading..."
            rm -f "$dest"
        fi
    fi

    step "Downloading $name..."
    curl -sL -o "$dest" "$url"
    local actual
    actual=$(shasum -a 256 "$dest" | awk '{print $1}')
    if [ "$actual" != "$sha256" ]; then
        fail "SHA256 mismatch for $name (expected $sha256, got $actual)"
    fi
    ok "$name downloaded + verified"
}

make_universal() {
    local output="$1"
    local arm64="$2"
    local x86_64="$3"
    local name
    name=$(basename "$output")
    mkdir -p "$(dirname "$output")"
    lipo -create -output "$output" "$arm64" "$x86_64" 2>/dev/null
    codesign --force --sign - "$output" 2>/dev/null
    ok "$name (universal arm64+x86_64)"
}

# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------
if [ "$CLEAN" = true ]; then
    echo "  Cleaning build directory..."
    cd "$BUILD_DIR"
    find . -maxdepth 1 \
        ! -name '.' \
        ! -name '..' \
        ! -name '*.sh' \
        ! -name '*.patch' \
        ! -name '.git' \
        -exec rm -rf {} +
    ok "Cleaned (only scripts and patches remain)"
    exit 0
fi

# Init log
mkdir -p "$BUILD_DIR"
: > "$LOG_FILE"

echo ""
echo "══════════════════════════════════════════"
echo "  L2TP Hub — native dependencies build"
echo "══════════════════════════════════════════"
echo ""
echo "  Log: $LOG_FILE"
echo ""

# ---------------------------------------------------------------------------
# Step 0: Download sources
# ---------------------------------------------------------------------------
echo "── Step 0: Sources ──────────────────────"

cd "$BUILD_DIR"

download "$OPENSSL_URL" "$BUILD_DIR/openssl-${OPENSSL_VERSION}.tar.gz" "$OPENSSL_SHA256"
download "$STRONGSWAN_URL" "$BUILD_DIR/strongswan-${STRONGSWAN_VERSION}.tar.bz2" "$STRONGSWAN_SHA256"

if [ ! -d "$XL2TPD_SRC" ]; then
    step "Cloning xl2tpd ($XL2TPD_COMMIT)..."
    git clone -q "$XL2TPD_REPO" "$XL2TPD_SRC" >> "$LOG_FILE" 2>&1
    cd "$XL2TPD_SRC"
    git checkout -q "$XL2TPD_COMMIT" >> "$LOG_FILE" 2>&1
    cd "$BUILD_DIR"
    ok "xl2tpd cloned"
else
    ok "xl2tpd cached"
fi

# ---------------------------------------------------------------------------
# Step 1: Extract sources
# ---------------------------------------------------------------------------
echo ""
echo "── Step 1: Extract ──────────────────────"

if [ ! -d "$OPENSSL_SRC" ]; then
    step "Extracting openssl..."
    tar xzf "$BUILD_DIR/openssl-${OPENSSL_VERSION}.tar.gz" >> "$LOG_FILE" 2>&1
    ok "openssl extracted"
else
    ok "openssl cached"
fi

if [ ! -d "$STRONGSWAN_SRC" ]; then
    step "Extracting strongswan..."
    tar xjf "$BUILD_DIR/strongswan-${STRONGSWAN_VERSION}.tar.bz2" >> "$LOG_FILE" 2>&1
    ok "strongswan extracted"
else
    ok "strongswan cached"
fi

# ---------------------------------------------------------------------------
# Step 2: Build OpenSSL (universal)
# ---------------------------------------------------------------------------
echo ""
echo "── Step 2: OpenSSL ${OPENSSL_VERSION} ────────────────"

if [ "$SKIP_SSL" = false ]; then
    OPENSSL_CONFIGURE_OPTS=(
        enable-ec_nistp_64_gcc_128
        no-acvp-tests no-afalgeng no-allocfail-tests no-asan
        no-brotli no-brotli-dynamic no-buildtest-c++
        no-comp no-crypto-mdebug no-crypto-mdebug-backtrace
        no-demos no-devcryptoeng no-egd no-external-tests
        no-fips no-fips-jitter no-fips-post no-fips-securitychecks
        no-fuzz-afl no-fuzz-libfuzzer no-h3demo no-hqinterop
        no-jitter no-ktls no-lms no-md2 no-msan no-pie no-rc5
        no-sctp no-ssl3 no-ssl3-method no-sslkeylog no-tfo
        no-trace no-ubsan no-unit-test no-uplink
        no-weak-ssl-ciphers no-winstore
        no-zlib no-zlib-dynamic no-zstd no-zstd-dynamic
    )

    for arch in arm64 x86_64; do
        BUILD_SSL="$BUILD_DIR/build-ssl-${arch}"
        if [ -f "$BUILD_SSL/libcrypto.3.dylib" ]; then
            ok "OpenSSL ${arch} cached"
            continue
        fi

        step "Building OpenSSL ${arch}..."
        mkdir -p "$BUILD_SSL"
        cd "$BUILD_SSL"

        if [ "$arch" = "arm64" ]; then
            CARCH="-arch arm64"
        else
            CARCH="-arch x86_64"
        fi

        eval "\"$OPENSSL_SRC/Configure\" \
            --prefix=\"$OPENSSL_PREFIX\" \
            --openssldir=\"$OPENSSL_PREFIX\" \
            \"CFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}\" \
            \"LDFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}\" \
            \"${OPENSSL_CONFIGURE_OPTS[*]}\"" $REDIRECT

        eval "make -j\"$(sysctl -n hw.ncpu)\"" $REDIRECT
        ok "OpenSSL ${arch} built"
    done

    # Install headers + libs
    if [ -f "$OPENSSL_PREFIX/lib/libcrypto.3.dylib" ] && [ -f "$OPENSSL_PREFIX/include/openssl/opensslv.h" ]; then
        ok "OpenSSL installed"
    else
        step "Installing OpenSSL..."
        cd "$BUILD_DIR/build-ssl-arm64"
        eval "make install_sw" $REDIRECT
        ok "OpenSSL installed"
    fi

    # Replace arch-specific libs with universal
    for lib in libcrypto.3.dylib libssl.3.dylib; do
        make_universal \
            "$OPENSSL_PREFIX/lib/$lib" \
            "$BUILD_DIR/build-ssl-arm64/$lib" \
            "$BUILD_DIR/build-ssl-x86_64/$lib"
    done
else
    echo "  Skipped (--skip-ssl)"
fi

# ---------------------------------------------------------------------------
# Step 3: Build strongSwan (universal)
# ---------------------------------------------------------------------------
echo ""
echo "── Step 3: strongSwan ${STRONGSWAN_VERSION} ─────────────"

STRONGSWAN_CONFIGURE_OPTS=(
    --disable-defaults
    --enable-monolithic
    --enable-charon
    --enable-openssl
    --enable-kernel-pfroute
    --enable-kernel-pfkey
    --enable-osx-attr
    --enable-socket-default
    --enable-stroke
    --enable-vici
    --enable-pem
    --enable-pkcs1
    --enable-pkcs8
    --enable-x509
    --enable-pubkey
    --enable-constraints
    --enable-revocation
    --enable-nonce
    --enable-kdf
    --enable-curve25519
    --enable-ikev1
    --enable-ikev2
    --enable-eap-mschapv2
    --enable-eap-identity
    --enable-xauth-generic
    --enable-unity
    --enable-updown
    --enable-swanctl
)

for arch in arm64 x86_64; do
    BUILD_SS="$BUILD_DIR/build-${arch}"
    if [ -f "$BUILD_SS/src/charon/.libs/charon" ] 2>/dev/null; then
        ok "strongSwan ${arch} cached"
        continue
    fi

    step "Building strongSwan ${arch}..."
    mkdir -p "$BUILD_SS"
    cd "$BUILD_SS"

    if [ "$arch" = "arm64" ]; then
        HOST="aarch64-apple-darwin"
        CARCH="-arch arm64"
    else
        HOST="x86_64-apple-darwin"
        CARCH="-arch x86_64"
    fi

    eval "\"$STRONGSWAN_SRC/configure\" \
        --host=\"$HOST\" \
        \"CFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}\" \
        \"LDFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS} -L${OPENSSL_PREFIX}/lib\" \
        \"CPPFLAGS=-I${OPENSSL_PREFIX}/include\" \
        \"${STRONGSWAN_CONFIGURE_OPTS[*]}\"" $REDIRECT

    eval "make -j\"$(sysctl -n hw.ncpu)\"" $REDIRECT
    ok "strongSwan ${arch} built"
done

step "Creating universal binaries..."

make_universal \
    "$BUILD_DIR/universal/lib/ipsec/charon" \
    "$BUILD_DIR/build-arm64/src/charon/.libs/charon" \
    "$BUILD_DIR/build-x86_64/src/charon/.libs/charon"

make_universal \
    "$BUILD_DIR/universal-swanctl/swanctl" \
    "$BUILD_DIR/build-arm64/src/swanctl/.libs/swanctl" \
    "$BUILD_DIR/build-x86_64/src/swanctl/.libs/swanctl"

for lib in libcharon.0.dylib libstrongswan.0.dylib libvici.0.dylib; do
    make_universal \
        "$BUILD_DIR/universal/lib/ipsec/$lib" \
        "$BUILD_DIR/build-arm64/src/libstrongswan/.libs/$lib" \
        "$BUILD_DIR/build-x86_64/src/libstrongswan/.libs/$lib" 2>/dev/null || \
    make_universal \
        "$BUILD_DIR/universal/lib/ipsec/$lib" \
        "$BUILD_DIR/build-arm64/src/${lib%.0.dylib}/.libs/$lib" \
        "$BUILD_DIR/build-x86_64/src/${lib%.0.dylib}/.libs/$lib" 2>/dev/null || \
    warn "$lib — проверь путь вручную"
done

# OpenSSL universal libs
for lib in libcrypto.3.dylib libssl.3.dylib; do
    if [ ! -f "$BUILD_DIR/universal/lib/ipsec/$lib" ]; then
        cp "$OPENSSL_PREFIX/lib/$lib" "$BUILD_DIR/universal/lib/ipsec/$lib"
    fi
done

# ipsec helper script
cat > "$BUILD_DIR/universal/lib/ipsec/ipsec" << 'IPSEC_EOF'
#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
export DYLD_LIBRARY_PATH="$DIR"
exec "$DIR/charon" "$@"
IPSEC_EOF
chmod +x "$BUILD_DIR/universal/lib/ipsec/ipsec"

# ---------------------------------------------------------------------------
# Step 4: Build xl2tpd (universal)
# ---------------------------------------------------------------------------
echo ""
echo "── Step 4: xl2tpd ${XL2TPD_COMMIT} ───────────────────"

cd "$XL2TPD_SRC"

PATCH_FILE="$BUILD_DIR/xl2tpd-macos.patch"
if ! grep -q "STRLEN 512" file.h 2>/dev/null; then
    step "Applying macOS patches..."
    git apply "$PATCH_FILE" >> "$LOG_FILE" 2>&1
    ok "Patches applied"
else
    ok "Patches cached"
fi

for arch in arm64 x86_64; do
    step "Building xl2tpd ${arch}..."
    make clean >> "$LOG_FILE" 2>&1 || true
    eval "make CC=\"cc -arch ${arch}\" \
        LDFLAGS=\"-arch ${arch} -mmacosx-version-min=${MIN_MACOS}\" \
        OSFLAGS=\"-DDARWIN\" IPFLAGS=\"\" \
        DFLAGS=\"-DDEBUG_PPPD -DTRUST_PPPD_TO_DIE\" \
        xl2tpd" $REDIRECT
    cp xl2tpd "/tmp/xl2tpd-${arch}"
    ok "xl2tpd ${arch} built"
done

make_universal \
    "$BUILD_DIR/universal-xl2tpd/xl2tpd" \
    /tmp/xl2tpd-arm64 \
    /tmp/xl2tpd-x86_64

# ---------------------------------------------------------------------------
# Step 5: Copy to resources
# ---------------------------------------------------------------------------
echo ""
echo "── Step 5: Deploy ───────────────────────"

mkdir -p "$RESOURCES_DIR/ipsec" "$RESOURCES_DIR/xl2tpd" "$RESOURCES_DIR/etc"

cp "$BUILD_DIR/universal/lib/ipsec/charon"                "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/ipsec"                 "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libcharon.0.dylib"     "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libcrypto.3.dylib"     "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libssl.3.dylib"        "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libstrongswan.0.dylib" "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libvici.0.dylib"       "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal-swanctl/swanctl"                  "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal-xl2tpd/xl2tpd"                    "$RESOURCES_DIR/xl2tpd/"
cp "$BUILD_DIR/../src-tauri/resources/etc/strongswan.conf" "$RESOURCES_DIR/etc/" 2>/dev/null || true

ok "Deployed to src-tauri/resources/"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "══════════════════════════════════════════"
echo "  BUILD COMPLETE"
echo "══════════════════════════════════════════"
echo ""
echo "  Dependencies (pinned):"
echo "    OpenSSL      ${OPENSSL_VERSION}  sha256:${OPENSSL_SHA256:0:16}…"
echo "    strongSwan   ${STRONGSWAN_VERSION}  sha256:${STRONGSWAN_SHA256:0:16}…"
echo "    xl2tpd       ${XL2TPD_COMMIT}  xelerance/xl2tpd"
echo ""

fmt="    %-30s %6s  %s\n"
printf "$fmt" "BINARY" "SIZE" "PATH"
printf "$fmt" "──────" "────" "────"

for f in \
    "$RESOURCES_DIR/ipsec/charon" \
    "$RESOURCES_DIR/ipsec/swanctl" \
    "$RESOURCES_DIR/ipsec/libcharon.0.dylib" \
    "$RESOURCES_DIR/ipsec/libcrypto.3.dylib" \
    "$RESOURCES_DIR/ipsec/libssl.3.dylib" \
    "$RESOURCES_DIR/ipsec/libstrongswan.0.dylib" \
    "$RESOURCES_DIR/ipsec/libvici.0.dylib" \
    "$RESOURCES_DIR/xl2tpd/xl2tpd"; do
    name=$(basename "$f")
    size=$(ls -lh "$f" | awk '{print $5}')
    printf "$fmt" "$name" "$size" "$f"
done

echo ""
printf "$fmt" "ipsec" "—" "$RESOURCES_DIR/ipsec/ipsec"
printf "$fmt" "strongswan.conf" "—" "$RESOURCES_DIR/etc/strongswan.conf"
printf "$fmt" "route-guardian.sh" "—" "$RESOURCES_DIR/route-guardian.sh"

echo ""
echo "  Architecture:"
for f in "$RESOURCES_DIR/ipsec/charon" "$RESOURCES_DIR/ipsec/swanctl" "$RESOURCES_DIR/xl2tpd/xl2tpd"; do
    name=$(basename "$f")
    arches=$(file "$f" | head -1 | sed 's/.*: Mach-O /Mach-O /')
    echo "    $name → $arches"
done
echo ""
