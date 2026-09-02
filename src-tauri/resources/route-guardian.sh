#!/bin/bash
# =============================================================================
# route-guardian.sh — detached watchdog + full VPN cleanup agent
# =============================================================================
# Запускается через sudo с process_group(0) — живёт независимо от Tauri.
# Если Tauri крашнется или пользователь закроет приложение — watchdog обнаружит
# что pppd/charon/xl2tpd умерли и ПОЛНОСТЬЮ откатит всё.
#
# Аргументы: $1=original_interface $2=original_gateway $3=vpn_server $4=check_interval $5=max_lifetime_hours
#
# Идемпотентен — безопасен при штатном disconnect.

ORIG_IFACE="$1"
ORIGINAL_GW="$2"
SERVER_IP="$3"
CHECK_INTERVAL="${4:-5}"
MAX_HOURS="${5:-24}"
LOG="/tmp/l2tp/route-guardian.log"
TAURI_PID_FILE="/tmp/l2tp/tauri.pid"

CHARON_LABEL="com.sentiago.l2tp-hub.charon"
XL2TPD_LABEL="com.sentiago.l2tp-hub.xl2tpd"

mkdir -p /tmp/l2tp

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [guardian] $*" >> "$LOG"
}

# =============================================================================
# Умное определение gateway для восстановления route
# Сначала проверяет исходный интерфейс, потом ищет любой активный
# =============================================================================
resolve_gateway() {
    local orig_iface="$1"

    # Шаг 1: жив ли исходный физический интерфейс?
    if [ -n "$orig_iface" ] && ifconfig "$orig_iface" 2>/dev/null | grep -q "status: active"; then
        local gw
        gw=$(route -n get -ifscope "$orig_iface" default 2>/dev/null | awk '/gateway/{print $2}')
        if [ -n "$gw" ]; then
            log "resolved gateway via original iface $orig_iface: $gw"
            echo "$gw"
            return
        fi
    fi

    # Шаг 2: исходный интерфейс не активен — ищем любой активный физический
    log "original iface $orig_iface not active, searching alternatives..."
    for iface in en0 en1 en2 en3 en4; do
        if ifconfig "$iface" 2>/dev/null | grep -q "status: active"; then
            local gw
            gw=$(route -n get -ifscope "$iface" default 2>/dev/null | awk '/gateway/{print $2}')
            if [ -n "$gw" ]; then
                log "resolved gateway via alternative iface $iface: $gw"
                echo "$gw"
                return
            fi
        fi
    done

    # Шаг 3: fallback — scutil --nwi
    local primary_iface
    primary_iface=$(scutil --nwi 2>/dev/null | awk '/IPv4 default interface/{print $NF}')
    if [ -n "$primary_iface" ]; then
        local gw
        gw=$(route -n get -ifscope "$primary_iface" default 2>/dev/null | awk '/gateway/{print $2}')
        if [ -n "$gw" ]; then
            log "resolved gateway via scutil nwi ($primary_iface): $gw"
            echo "$gw"
            return
        fi
    fi

    log "WARNING: could not resolve any gateway"
}

# =============================================================================
# Full cleanup — вызывается при обнаружении краша или при штатном выходе
# =============================================================================
full_cleanup() {
    log "=== FULL CLEANUP START ==="

    # 1. Умное восстановление default route
    RESTORE_GW=$(resolve_gateway "$ORIG_IFACE")

    if [ -n "$RESTORE_GW" ]; then
        log "restoring default route to $RESTORE_GW (iface=$ORIG_IFACE)"
        /sbin/route delete -host "$SERVER_IP" 2>/dev/null
        /sbin/route delete default 2>/dev/null
        /sbin/route add default "$RESTORE_GW" 2>> "$LOG"
        # Верификация
        GW_NOW=$(route -n get default 2>/dev/null | awk '/gateway:/{print $2}')
        if [ "$GW_NOW" = "$RESTORE_GW" ]; then
            log "route verified: default gw = $GW_NOW ✓"
        else
            log "WARNING: route restore mismatch. expected=$RESTORE_GW got=$GW_NOW"
        fi
    else
        log "WARNING: no gateway resolved — deleting VPN default, user may need manual fix"
        /sbin/route delete -host "$SERVER_IP" 2>/dev/null
        /sbin/route delete default 2>/dev/null
    fi

    # 2. Убить всех VPN-процессов (SIGTERM → пауза → SIGKILL)
    log "killing VPN processes (SIGTERM)..."
    for proc in charon xl2tpd pppd; do
        pkill -TERM -f "$proc" 2>/dev/null
    done
    sleep 2
    log "killing VPN processes (SIGKILL)..."
    for proc in charon xl2tpd pppd; do
        pkill -9 -f "$proc" 2>/dev/null
    done

    # 3. Удалить LaunchDaemon plists и bootout
    log "removing LaunchDaemons..."
    for label in "$CHARON_LABEL" "$XL2TPD_LABEL"; do
        launchctl bootout "system/$label" 2>/dev/null
        rm -f "/Library/LaunchDaemons/$label.plist"
    done

    # 4. Удалить VICI/pid/ctl файлы
    log "removing stale pid/vici files..."
    rm -f /var/run/charon.pid
    rm -f /var/run/charon.vici
    rm -f /var/run/charon.ctl
    rm -f /var/run/xl2tpd/l2tp-control

    # 5. Удалить route.state
    rm -f /private/var/root/l2tp-hub/route.state

    # 6. Удалить active configs (секреты)
    rm -rf /private/var/root/l2tp-hub/active

    # 7. Убить других watchdog'ов (кроме себя)
    MY_PID=$$
    for pid in $(pgrep -f "route-guardian.sh"); do
        if [ "$pid" != "$MY_PID" ]; then
            kill "$pid" 2>/dev/null
            log "killed another guardian pid=$pid"
        fi
    done

    # 8. Удалить PID файлы
    rm -f /tmp/l2tp/route-guardian.pid
    rm -f "$TAURI_PID_FILE"

    log "=== FULL CLEANUP DONE ==="
}

# =============================================================================
# Pre-flight
# =============================================================================
if [ -z "$SERVER_IP" ]; then
    log "ERROR: missing args. Usage: $0 <original_interface> <original_gateway> <server_ip> [check_interval] [max_hours]"
    exit 1
fi

log "started: iface=$ORIG_IFACE gw=$ORIGINAL_GW server=$SERVER_IP interval=${CHECK_INTERVAL}s max=${MAX_HOURS}h pid=$$"

# Сохраняем свой PID для cleanup
echo $$ > /tmp/l2tp/route-guardian.pid

# Перехватываем сигналы — при SIGTERM/SIGINT делаем full cleanup
trap full_cleanup TERM INT

MAX_ITERATIONS=$(( MAX_HOURS * 3600 / CHECK_INTERVAL ))
ITERATION=0

# =============================================================================
# Main loop — мониторим здоровье VPN
# =============================================================================
while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
    sleep "$CHECK_INTERVAL"
    ITERATION=$((ITERATION + 1))

    # Проверяем жив ли pppd (основной индикатор VPN-туннеля)
    PPPD_ALIVE=false
    if pgrep -x pppd > /dev/null 2>&1; then
        PPPD_ALIVE=true
    fi

    # Проверяем жив ли charon (IPSec)
    CHARON_ALIVE=false
    if pgrep -x charon > /dev/null 2>&1 || pgrep -f "charon$" > /dev/null 2>&1; then
        CHARON_ALIVE=true
    fi

    # Проверяем жив ли xl2tpd
    XL2TPD_ALIVE=false
    if pgrep -x xl2tpd > /dev/null 2>&1; then
        XL2TPD_ALIVE=true
    fi

    # Проверяем жив ли Tauri-процесс (родитель)
    TAURI_ALIVE=true
    if [ -f "$TAURI_PID_FILE" ]; then
        TAURI_PID=$(cat "$TAURI_PID_FILE" 2>/dev/null)
        if [ -n "$TAURI_PID" ] && ! kill -0 "$TAURI_PID" 2>/dev/null; then
            TAURI_ALIVE=false
        fi
    fi

    # Если Tauri мёртв — приложение закрылось/крашнулось, восстанавливаем сеть
    if [ "$TAURI_ALIVE" = "false" ]; then
        log "tauri process dead (pid file=$TAURI_PID_FILE) — running full cleanup"
        full_cleanup
        log "exiting after cleanup (tauri dead)"
        exit 0
    fi

    # Если pppd мёртв — VPN-туннель упал, нужен полный cleanup
    if [ "$PPPD_ALIVE" = "false" ]; then
        log "pppd dead (charon=$CHARON_ALIVE xl2tpd=$XL2TPD_ALIVE) — running full cleanup"
        full_cleanup
        log "exiting after cleanup (pppd dead)"
        exit 0
    fi

    # Если charon мёртв но pppd жив — VPN в деградированном состоянии
    if [ "$CHARON_ALIVE" = "false" ]; then
        log "WARNING: charon dead but pppd alive — checking route integrity"
    fi

    # Heartbeat каждые 60 итераций (~5 мин при interval=5)
    if [ $((ITERATION % 60)) -eq 0 ]; then
        log "heartbeat: pppd=$PPPD_ALIVE charon=$CHARON_ALIVE xl2tpd=$XL2TPD_ALIVE tauri=$TAURI_ALIVE (iter $ITERATION/$MAX_ITERATIONS)"
    fi
done

# Max lifetime reached — делаем cleanup и выходим
log "max lifetime reached ($MAX_HOURS hours) — running final cleanup"
full_cleanup
exit 0
