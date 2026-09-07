# L2TP Hub — Открытые задачи

## ✅ Выполнено

### ActiveBanner показывает display_title + метки
- ~~Строка `active.name` показывает UUID, а не display_title~~
- ✅ Используется `getDisplayTitle(active)` + label chips (как в ConnectionRow)

### Кнопка подключения с выбором режима
- ~~ConnectButton → одно действие «Подключить»~~
- ✅ Две кнопки `[ Сплит ] [ Фулл ]` вместо единой. При подключении — режим с ✓.

### name → service_name в бэкенде
- ~~`Connection.name` = UUID (дублирует `id`)~~
- ✅ Переименовано в `Connection.service_name` во всём бэкенде, `#[serde(alias = "name")]` для обратной совместимости

### ⋮ меню для вторичных действий
- ✅ Info/NetworkCheck/Delete перенесены в ⋮ (MoreVert) меню
- Пункты: Проверить доступность, Скопировать ID, Логи, Удалить

### Connection Logs + History
- ✅ План в `PLAN-CONNECTION-LOGS.md` реализован
- Сохранение в `/private/var/root/l2tp-hub/history/{connection_id}/{timestamp}/`
- Ротация 10 сессий на connection
- ConnectionLogDrawer с вкладками Charon|pppd|xl2tpd|App

### Обновление CONTEXT.md
- ✅ Актуализирован под текущее состояние (split tunneling, service_name, логи, кнопки)

## Отложено

### Uptime показывает 30 минут при <1 минуте
- `connected_since` передаётся через event payload
- Возможно `connected_since` записывается до того как pppd реально поднимается

### Git LFS для бинарников
- ~18 MB universal бинарников в репозитории
- Рассмотреть Git LFS для `src-tauri/resources/ipsec/` и `src-tauri/resources/xl2tpd/`

### Свёрка логов strongSwan 6.0.7
- Connect Error Classification использует текстовые маркеры
- Стоит свериться на реальных логах что паттерны действительно встречаются
