# L2TP Hub

Менеджер L2TP/IPSec VPN-подключений для macOS и Windows. Создан для IT-специалистов которые работают с большим количеством клиентских сетей.

## Возможности

- Быстрое подключение и отключение от VPN одним кликом
- Метки для категоризации подключений (компания, филиал и др.)
- Фильтрация и сортировка по статусу, приоритету, меткам
- Табличный и карточный вид
- Экспорт и импорт конфигурации с AES-256-GCM шифрованием
- Пароли хранятся в системном хранилище ключей (Keychain / Windows Credential Manager)

## Требования

- macOS 13–15 (macOS 26 Tahoe не поддерживается — L2TP удалён из системы)
- Windows 10/11
- macOS: [macosvpn](https://github.com/halo/macosvpn) — `brew install macosvpn`

## Сборка

```bash
bun install
bun run tauri build
```

## Разработка

```bash
bun run tauri dev
```

## Стек

- [Tauri 2](https://tauri.app/) — фреймворк
- React + TypeScript + MUI — интерфейс
- Rust — бэкенд, системные вызовы, шифрование