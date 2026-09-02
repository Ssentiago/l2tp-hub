# Plan: Connection Logs + History

## Хранение

```
/private/var/root/l2tp-hub/history/
  {connection_id}/
    {unix_timestamp}/
      charon, pppd.log, xl2tpd.log
      charon-stdout.log, charon-stderr.log
      xl2tpd-stdout.log, xl2tpd-stderr.log
      meta.json  ← { started_at, ended_at, status, error?, server }
```

Ротация: 10 сессий на connection.

## Backend

- `src-tauri/src/l2tp/logs.rs` — новый модуль
- `save_session_logs()` — копирует /tmp/l2tp/{name}-* перед cleanup
- `get_session_logs()` / `get_connection_history()` / `get_live_logs()`
- Интеграция в connect_vpn (перед pre-connect cleanup) и disconnect_vpn (перед post-connect cleanup)
- Новые Tauri commands: `get_connection_logs`, `get_session_detail`

## Frontend

- `ConnectionLogDrawer` — Drawer с вкладками charon|pppd|xl2tpd|app + селектор сессии
- Live через event-based обновление
- Кнопка в ActionButtons (всегда видна)
- Threading: App → Connections → ConnectionList → ConnectionRow → ActionButtons

## Решено

- 10 сессий на connection ✓
- Вкладки по компонентам ✓
- Event-based live ✓