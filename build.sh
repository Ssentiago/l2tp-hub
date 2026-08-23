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
for arg in "$@"; do
    case "$arg" in
        --skip-ssl) SKIP_SSL=true ;;
        --clean) CLEAN=true ;;
    esac
done

# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------
if [ "$CLEAN" = true ]; then
    echo "=== Cleaning build directory ==="
    cd "$BUILD_DIR"
    # Удаляем всё кроме скриптов, патчей и .git
    find . -maxdepth 1 \
        ! -name '.' \
        ! -name '..' \
        ! -name '*.sh' \
        ! -name '*.patch' \
        ! -name '.git' \
        -exec rm -rf {} +
    echo "Done. Only scripts and patches remain."
    exit 0
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
download() {
    local url="$1"
    local dest="$2"
    local sha256="$3"

    if [ -f "$dest" ]; then
        local actual
        actual=$(shasum -a 256 "$dest" | awk '{print $1}')
        if [ "$actual" = "$sha256" ]; then
            echo "  ✓ $dest already exists and checksum matches"
            return 0
        else
            echo "  ✗ Checksum mismatch, re-downloading..."
            rm -f "$dest"
        fi
    fi

    echo "  Downloading $url ..."
    curl -L -o "$dest" "$url"
    local actual
    actual=$(shasum -a 256 "$dest" | awk '{print $1}')
    if [ "$actual" != "$sha256" ]; then
        echo "  FATAL: SHA256 mismatch for $dest"
        echo "  Expected: $sha256"
        echo "  Got:      $actual"
        rm -f "$dest"
        exit 1
    fi
    echo "  ✓ Checksum verified"
}

make_universal() {
    local output="$1"
    local arm64="$2"
    local x86_64="$3"
    mkdir -p "$(dirname "$output")"
    lipo -create -output "$output" "$arm64" "$x86_64"
    codesign --force --sign - "$output"
    echo "  ✓ Universal: $output ($(file "$output" | sed 's/.*: //'))"
}

# ---------------------------------------------------------------------------
# Step 0: Download sources
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Step 0: Downloading sources"
echo "============================================"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

download "$OPENSSL_URL" "$BUILD_DIR/openssl-${OPENSSL_VERSION}.tar.gz" "$OPENSSL_SHA256"
download "$STRONGSWAN_URL" "$BUILD_DIR/strongswan-${STRONGSWAN_VERSION}.tar.bz2" "$STRONGSWAN_SHA256"

if [ ! -d "$XL2TPD_SRC" ]; then
    echo "  Cloning xl2tpd ($XL2TPD_COMMIT)..."
    git clone "$XL2TPD_REPO" "$XL2TPD_SRC"
    cd "$XL2TPD_SRC"
    git checkout "$XL2TPD_COMMIT"
    cd "$BUILD_DIR"
else
    echo "  ✓ xl2tpd already cloned"
fi

# ---------------------------------------------------------------------------
# Step 1: Extract sources
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Step 1: Extracting sources"
echo "============================================"

if [ ! -d "$OPENSSL_SRC" ]; then
    echo "  Extracting openssl..."
    tar xzf "$BUILD_DIR/openssl-${OPENSSL_VERSION}.tar.gz"
else
    echo "  ✓ openssl already extracted"
fi

if [ ! -d "$STRONGSWAN_SRC" ]; then
    echo "  Extracting strongswan..."
    tar xjf "$BUILD_DIR/strongswan-${STRONGSWAN_VERSION}.tar.bz2"
else
    echo "  ✓ strongswan already extracted"
fi

# ---------------------------------------------------------------------------
# Step 2: Build OpenSSL (universal)
# ---------------------------------------------------------------------------
if [ "$SKIP_SSL" = false ]; then
    echo ""
    echo "============================================"
    echo " Step 2: Building OpenSSL universal"
    echo "============================================"

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
            echo "  ✓ OpenSSL ${arch} already built"
            continue
        fi

        echo "  Building OpenSSL ${arch}..."
        mkdir -p "$BUILD_SSL"
        cd "$BUILD_SSL"

        if [ "$arch" = "arm64" ]; then
            HOST="aarch64-apple-darwin"
            CARCH="-arch arm64"
        else
            HOST="x86_64-apple-darwin"
            CARCH="-arch x86_64"
        fi

        "$OPENSSL_SRC/Configure" \
            --prefix="$OPENSSL_PREFIX" \
            --openssldir="$OPENSSL_PREFIX" \
            "CFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}" \
            "LDFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}" \
            "${OPENSSL_CONFIGURE_OPTS[@]}"

        make -j"$(sysctl -n hw.ncpu)" 2>&1 | tail -3
        echo "  ✓ OpenSSL ${arch} built"
    done

    # Install headers + universal libs
    echo "  Installing universal OpenSSL..."
    cd "$BUILD_DIR/build-ssl-arm64"
    make install_sw DESTDIR="" 2>&1 | tail -1

    # Replace arch-specific libs with universal
    for lib in libcrypto.3.dylib libssl.3.dylib; do
        make_universal \
            "$OPENSSL_PREFIX/lib/$lib" \
            "$BUILD_DIR/build-ssl-arm64/$lib" \
            "$BUILD_DIR/build-ssl-x86_64/$lib"
    done
else
    echo ""
    echo "  Skipping OpenSSL (--skip-ssl)"
fi

# ---------------------------------------------------------------------------
# Step 3: Build strongSwan (universal)
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Step 3: Building strongSwan universal"
echo "============================================"

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
        echo "  ✓ strongSwan ${arch} already built"
        continue
    fi

    echo "  Building strongSwan ${arch}..."
    mkdir -p "$BUILD_SS"
    cd "$BUILD_SS"

    if [ "$arch" = "arm64" ]; then
        HOST="aarch64-apple-darwin"
        CARCH="-arch arm64"
    else
        HOST="x86_64-apple-darwin"
        CARCH="-arch x86_64"
    fi

    "$STRONGSWAN_SRC/configure" \
        --host="$HOST" \
        "CFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS}" \
        "LDFLAGS=${CARCH} -mmacosx-version-min=${MIN_MACOS} -L${OPENSSL_PREFIX}/lib" \
        "CPPFLAGS=-I${OPENSSL_PREFIX}/include" \
        "${STRONGSWAN_CONFIGURE_OPTS[@]}"

    make -j"$(sysctl -n hw.ncpu)" 2>&1 | tail -3
    echo "  ✓ strongSwan ${arch} built"
done

# Create universal binaries
echo "  Creating universal strongSwan binaries..."

# charon
make_universal \
    "$BUILD_DIR/universal/lib/ipsec/charon" \
    "$BUILD_DIR/build-arm64/src/charon/.libs/charon" \
    "$BUILD_DIR/build-x86_64/src/charon/.libs/charon"

# swanctl
make_universal \
    "$BUILD_DIR/universal-swanctl/swanctl" \
    "$BUILD_DIR/build-arm64/src/swanctl/.libs/swanctl" \
    "$BUILD_DIR/build-x86_64/src/swanctl/.libs/swanctl"

# Libraries
for lib in libcharon.0.dylib libstrongswan.0.dylib libvici.0.dylib; do
    make_universal \
        "$BUILD_DIR/universal/lib/ipsec/$lib" \
        "$BUILD_DIR/build-arm64/src/libstrongswan/.libs/$lib" \
        "$BUILD_DIR/build-x86_64/src/libstrongswan/.libs/$lib" 2>/dev/null || \
    make_universal \
        "$BUILD_DIR/universal/lib/ipsec/$lib" \
        "$BUILD_DIR/build-arm64/src/${lib%.0.dylib}/.libs/$lib" \
        "$BUILD_DIR/build-x86_64/src/${lib%.0.dylib}/.libs/$lib" 2>/dev/null || \
    echo "  ⚠ $lib — проверь путь вручную"
done

# OpenSSL universal libs (если ещё не на месте)
for lib in libcrypto.3.dylib libssl.3.dylib; do
    if [ ! -f "$BUILD_DIR/universal/lib/ipsec/$lib" ]; then
        cp "$OPENSSL_PREFIX/lib/$lib" "$BUILD_DIR/universal/lib/ipsec/$lib"
    fi
done

# ipsec helper script
cat > "$BUILD_DIR/universal/lib/ipsec/ipsec" << 'IPSEC_EOF'
#!/bin/sh
# strongSwan IPsec starter — points to bundled charon
DIR="$(cd "$(dirname "$0")" && pwd)"
export DYLD_LIBRARY_PATH="$DIR"
exec "$DIR/charon" "$@"
IPSEC_EOF
chmod +x "$BUILD_DIR/universal/lib/ipsec/ipsec"

# ---------------------------------------------------------------------------
# Step 4: Build xl2tpd (universal)
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Step 4: Building xl2tpd universal"
echo "============================================"

cd "$XL2TPD_SRC"

# Apply patches
PATCH_FILE="$BUILD_DIR/xl2tpd-macos.patch"
if ! grep -q "STRLEN 512" file.h 2>/dev/null; then
    echo "  Applying macOS patches..."
    git apply "$PATCH_FILE"
else
    echo "  ✓ Patches already applied"
fi

for arch in arm64 x86_64; do
    echo "  Building xl2tpd ${arch}..."
    make clean 2>/dev/null || true
    make CC="cc -arch ${arch}" \
        LDFLAGS="-arch ${arch} -mmacosx-version-min=${MIN_MACOS}" \
        OSFLAGS="-DDARWIN" IPFLAGS="" \
        DFLAGS="-DDEBUG_PPPD -DTRUST_PPPD_TO_DIE" \
        xl2tpd
    cp xl2tpd "/tmp/xl2tpd-${arch}"
done

make_universal \
    "$BUILD_DIR/universal-xl2tpd/xl2tpd" \
    /tmp/xl2tpd-arm64 \
    /tmp/xl2tpd-x86_64

# ---------------------------------------------------------------------------
# Step 5: Copy to resources
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Step 5: Copying to src-tauri/resources/"
echo "============================================"

mkdir -p "$RESOURCES_DIR/ipsec" "$RESOURCES_DIR/xl2tpd" "$RESOURCES_DIR/etc"

# strongSwan
cp "$BUILD_DIR/universal/lib/ipsec/charon"      "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/ipsec"        "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libcharon.0.dylib"   "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libcrypto.3.dylib"   "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libssl.3.dylib"      "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libstrongswan.0.dylib" "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal/lib/ipsec/libvici.0.dylib"     "$RESOURCES_DIR/ipsec/"
cp "$BUILD_DIR/universal-swanctl/swanctl"         "$RESOURCES_DIR/ipsec/"

# xl2tpd
cp "$BUILD_DIR/universal-xl2tpd/xl2tpd"          "$RESOURCES_DIR/xl2tpd/"

# Config templates
cp "$BUILD_DIR/../src-tauri/resources/etc/strongswan.conf" "$RESOURCES_DIR/etc/" 2>/dev/null || true

echo ""
echo "============================================"
echo " BUILD COMPLETE"
echo "============================================"
echo ""
echo "Resources:"
ls -lh "$RESOURCES_DIR/ipsec/" "$RESOURCES_DIR/xl2tpd/"
echo ""
echo "Universal binaries:"
file "$RESOURCES_DIR/ipsec/charon" "$RESOURCES_DIR/ipsec/swanctl" "$RESOURCES_DIR/xl2tpd/xl2tpd"
