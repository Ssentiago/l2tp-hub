#!/bin/bash
# =============================================================================
# route-guardian.sh — detached watchdog + full VPN cleanup agent
# =============================================================================
# Запускается через sudo с process_group(0) — живёт независимо от Tauri.
# Если Tauri крашнется или пользователь закроет приложение — watchdog обнаружит
# что pppd/charon/xl2tpd умерли и ПОЛНОСТЬЮ откатит всё:
#   1. Восстановит default route
#   2. Убьёт всех сиротских процессов (charon, xl2tpd, pppd)
#   3. Удалит LaunchDaemon plists
#   4. Удалит VICI/pid файлы
#   5. Удалит временные файлы и логи
#   6. Удалит route.state
#
# Аргументы: $1=original_gateway $2=vpn_server $3=check_interval $4=max_lifetime_hours
#
# Идемпотентен — безопасен при штатном disconnect (route уже правильный →
# ничего не делает, кроме убийства сирот).

ORIGINAL_GW="$1"
SERVER_IP="$2"
CHECK_INTERVAL="${3:-5}"
MAX_HOURS="${4:-24}"
LOG="/tmp/l2tp/route-guardian.log"

CHARON_LABEL="com.sentiago.l2tp-hub.charon"
XL2TPD_LABEL="com.sentiago.l2tp-hub.xl2tpd"

mkdir -p /tmp/l2tp

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [guardian] $*" >> "$LOG"
}

# =============================================================================
# Full cleanup — вызывается при обнаружении краша или при штатном выходе
# =============================================================================
full_cleanup() {
    log "=== FULL CLEANUP START ==="

    # 1. Восстановить default route (идемпотентно)
    if [ -n "$ORIGINAL_GW" ]; then
        log "restoring default route to $ORIGINAL_GW"
        /sbin/route delete -host "$SERVER_IP" 2>/dev/null
        /sbin/route delete default 2>/dev/null
        /sbin/route add default "$ORIGINAL_GW" 2>> "$LOG"
        # Верификация
        GW_NOW=$(route -n get default 2>/dev/null | awk '/gateway:/{print $2}')
        if [ "$GW_NOW" = "$ORIGINAL_GW" ]; then
            log "route verified: default gw = $GW_NOW ✓"
        else
            log "WARNING: route restore may have failed. expected=$ORIGINAL_GW got=$GW_NOW"
        fi
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

    # 8. Удалить PID файл
    rm -f /tmp/l2tp/route-guardian.pid

    log "=== FULL CLEANUP DONE ==="
}

# =============================================================================
# Pre-flight
# =============================================================================
if [ -z "$ORIGINAL_GW" ] || [ -z "$SERVER_IP" ]; then
    log "ERROR: missing args. Usage: $0 <original_gateway> <server_ip> [check_interval] [max_hours]"
    exit 1
fi

log "started: gw=$ORIGINAL_GW server=$SERVER_IP interval=${CHECK_INTERVAL}s max=${MAX_HOURS}h pid=$$"

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

    # Если pppd мёртв — VPN-туннель упал, нужен полный cleanup
    if [ "$PPPD_ALIVE" = "false" ]; then
        log "pppd dead (charon=$CHARON_ALIVE xl2tpd=$XL2TPD_ALIVE) — running full cleanup"
        full_cleanup
        log "exiting after cleanup (pppd dead)"
        exit 0
    fi

    # Если charon мёртв но pppd жив — VPN в деградированном состоянии
    # pppd скоро умрёт сам (IPSec туннель разорван), но на всякий случай
    # проверяем route
    if [ "$CHARON_ALIVE" = "false" ]; then
        log "WARNING: charon dead but pppd alive — checking route integrity"
        CURRENT_GW=$(route -n get default 2>/dev/null | awk '/gateway:/{print $2}')
        if [ "$CURRENT_GW" != "$ORIGINAL_GW" ] && [ "$CURRENT_GW" != "$SERVER_IP" ]; then
            log "route suspicious: gw=$CURRENT_GW (expected $ORIGINAL_GW or $SERVER_IP)"
        fi
    fi

    # Heartbeat каждые 60 итераций (~5 мин при interval=5)
    if [ $((ITERATION % 60)) -eq 0 ]; then
        log "heartbeat: pppd=$PPPD_ALIVE charon=$CHARON_ALIVE xl2tpd=$XL2TPD_ALIVE (iter $ITERATION/$MAX_ITERATIONS)"
    fi
done

# Max lifetime reached — делаем cleanup и выходим
log "max lifetime reached ($MAX_HOURS hours) — running final cleanup"
full_cleanup
exit 0
