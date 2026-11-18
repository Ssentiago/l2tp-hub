# Сборка и нативные зависимости

Документ описывает пайплайн сборки, компиляцию нативных зависимостей (OpenSSL,
strongSwan, xl2tpd), патчи, итоговый бандл и автоматизацию версий.

## Обзор

Приложение несет в себе собственные бинарники VPN-демонов, потому что строит туннель
в userspace и не полагается на встроенную поддержку L2TP в macOS. Скрипт `build.sh`
собирает их как универсальные бинарники
(arm64 и x86_64) с таргетом macOS 13.0 и раскладывает в `src-tauri/resources`.

## Компоненты сборки

| Артефакт | Версия | Источник |
|----------|--------|---------|
| OpenSSL | 3.6.3 | тарбол, проверка SHA256 |
| strongSwan | 6.0.7 | тарбол, проверка SHA256 |
| xl2tpd | 1.3.20 | git, закреплённый коммит |

Все версии закреплены в `build.sh`, архивы кэшируются и повторно проверяются по хешу.

## Пакетные скрипты

`package.json` связывает сборку:

`build:deps` запускает `build.sh` (полная сборка нативных зависимостей).
`build:deps:skip-ssl` переиспользует уже собранный OpenSSL. `build:deps:clean`
очищает артефакты. `build:helper` собирает helper как universal-бинарь (arm64 и
x86_64, склейка через `lipo`), `build:guardian` собирает guardian так же universal.
Оба копируют бинари с plist в `src-tauri/resources`. `build:all` цепляет всё вместе
с фронтом и Tauri.
Перед фронтом генерятся TypeScript-типы (`npm run gen:types`), этот шаг также вшит в
`tauri:dev` и `tauri:build`.
Для `build:helper` и `build:guardian` нужен rustup с установленными таргетами
`aarch64-apple-darwin` и `x86_64-apple-darwin`.

## Порядок build.sh

Флаги: `--skip-ssl` (переиспользовать OpenSSL), `--clean` (очистить), `--verbose`
(показывать вывод, по умолчанию пишется в `build-strongswan/build.log`). Требуются
macOS 13+ и Xcode Command Line Tools.

Шаг 0. Загрузка исходников с проверкой SHA256, клонирование xl2tpd на закреплённый
коммит.

Шаг 1. Распаковка тарболов.

Шаг 2. OpenSSL. Сборка по архитектурам с префиксом в `build-strongswan/openssl-universal`,
жёсткие флаги отключения слабых алгоритмов и функций. Затем установка, склейка
универсальных `libcrypto.3.dylib` и `libssl.3.dylib` через `lipo` и ad-hoc подпись.

Шаг 3. strongSwan. Конфигурация по архитектурам с указанием на OpenSSL, включение
нужных плагинов (charon, openssl, vici, swanctl, IKEv1, IKEv2, EAP и другие).
Универсальные бинарники `charon`, `swanctl` и библиотеки склеиваются через `lipo`,
генерируется обёртка `ipsec`.

Шаг 4. xl2tpd. Применение патча `xl2tpd-macos.patch`, сборка по архитектурам,
склейка и подпись.

Шаг 5. Деплой. Копирование `charon`, `ipsec`, `swanctl`, динамических библиотек и
`xl2tpd` в `src-tauri/resources`, конфиг `etc/strongswan.conf`.

Шаг 5b. Правка путей библиотек. `install_name_tool` переписывает абсолютные пути
динамических библиотек на `@loader_path`, добавляет rpath, создаёт симлинки, затем
повторная ad-hoc подпись всех Mach-O файлов.

Итоговая сводка печатает версии, размеры и архитектуру ключевых бинарников.

## Патчи xl2tpd

`xl2tpd-macos.patch` содержит несколько правок для macOS:

`file.h`: увеличен размер буфера пути конфигурации (STRLEN со 100 до 512), потому что
пути в `~/Library/Application Support/` не влезали.

`l2tp.h`: увеличен буфер опций (MAXSTRLEN со 120 до 512), чтобы путь к файлу опций pppd
не обрезался.

`md5.c`: правка порядка байт для Darwin.

`osport.h`: пропуск самодельной заглушки `struct in_pktinfo`, системные заголовки уже
её определяют.

`pty.c`: именование PTY-устройств как в FreeBSD.

Файл `xl2tpd-strlen.patch` это устаревший уменьшенный вариант, скриптами не
используется.

## Ресурсы в бандле

`tauri.conf.json` описывает, что попадает в приложение:

| Ресурс | Назначение |
|--------|-----------|
| `resources/ipsec/*` | charon, ipsec, swanctl, динамические библиотеки, OpenSSL |
| `resources/xl2tpd/*` | Демон xl2tpd |
| `resources/etc/*` | Конфиг strongswan (заглушка) |
| `resources/helper/*` | Бинарь helper и его plist |
| `resources/guardian/*` | Бинарь guardian и его plist |

Dev-helper (`npm run build:helper:dev`) собирается в `helper/target/debug` и в ресурсы
не кладётся: в релизный бандл он физически не попадает.

Поиск ресурсов во время выполнения идёт через `find_resource` в `l2tp/macos/paths.rs`:
в dev-сборке берётся путь `l2tp-hub-core/resources`, иначе `resource_dir` приложения.

## Конфигурация strongswan

`resources/etc/strongswan.conf` это заглушка, перезаписываемая во время выполнения.
Реальные конфиги charon генерируются на каждое подключение и лежат в активной
root-директории.

## Автоматизация версий

`jrit.toml` описывает инструмент релизов jrit. Проект `l2tp-hub`, репозиторий
`Ssentiago/l2tp-hub`, ветка `main`, changelog в стиле conventional в `CHANGELOG.md`,
режим релиза через CI.

Три компонента с версией, которые поднимаются вместе: `backend-tauri` (версия в
`src-tauri/Cargo.toml` и `src-tauri/tauri.conf.json`), `frontend` (версия в
`package.json`) и `helper` (версия в `helper/Cargo.toml`). Упаковкой занимается CI,
jrit только поднимает версии и пишет changelog: в режиме `ci` поля `build` и
`artifact` компонентов jrit игнорирует.

Версия приложения (1.0.0) именно отсюда, именно её `sudo.rs` сравнивает с версией
helper при рукопожатии. Версии поднимаются вместе, поэтому helper переустанавливается
при обновлении приложения, а не при каждом запуске.

## Сборка в CI

Воркфлоу `build.yaml` и `release.yml` перед упаковкой пересобирают все нативные
бинари на macOS-раннере и не полагаются на закоммиченные файлы в `src-tauri/resources`:

Шаг `bun run build:helper` собирает helper universal, `bun run build:guardian`
собирает guardian universal, `bun run build:deps` запускает `build.sh` для strongSwan,
xl2tpd и OpenSSL. Между guardian и зависимостями каталог `build-strongswan`
восстанавливается из кеша `actions/cache` с ключом по хешу `build.sh` и патчей:
повторные сборки переиспользуют скачанные исходники и собранные по архитектурам
артефакты, `build.sh` при этом всё равно прогоняет склейку `lipo` и деплой в ресурсы.
Воркфлоу собирают только macOS: Windows-таргет из пайплайна убран, код Windows
остаётся в репозитории, но не собирается. Старые воркфлоу с Windows-джобом лежат
рядом как `windows-build.yaml.disabled` и `windows-release.yml.disabled`: суффикс
`.disabled` обязателен, иначе GitHub подхватит файл и начнёт гонять мёртвый таргет.

Закоммиченные бинари в `src-tauri/resources` остаются для локальной разработки и
могут отставать от исходников; релизный бандл всегда содержит свежесобранные.

## Сборка приложения

`tauri.conf.json`: имя продукта L2TP Hub, идентификатор `com.sentiago.l2tp-hub`, одно
окно 640 на 480, CSP ограничена. Перед dev-сборкой запускается `bun run dev`, перед
продакшн `bun run build`, фронт берётся из `dist`.

Бандл подписывается ad-hoc: `bundle.macOS.signingIdentity: "-"`. Это не сертификат
Developer ID, но даёт бандлу валидную кодовую подпись с identifier
`com.sentiago.l2tp-hub` и CDHash. На этой подписи держится проверка пира в helper:
`sudo.rs` берёт CDHash текущего бинаря при установке и зачисляет его в файл доверия
(см. `docs/daemons.md`). Без подписи установка helper падает с ошибкой, а неподписанные
dev-бинари идут через отдельный dev-helper без проверки.

На Windows `build.rs` встраивает манифест с `requireAdministrator`, поэтому
привилегированный запуск идёт напрямую без helper. Сборка под Windows сейчас не
ведётся: код оставлен как есть.

## Чеклист полной сборки

Требуется Xcode Command Line Tools. Собираются helper и guardian (`build:helper`,
`build:guardian`), затем нативные зависимости (`build:deps` или с `--skip-ssl`).
Бинарники должны находиться в `src-tauri/resources`. Запускается `tauri:build` или
`build:all`. Состав ресурсов в бандле проверяется по таблице выше.
