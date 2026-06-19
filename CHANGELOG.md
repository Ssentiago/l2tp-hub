## [0.6.0] - 2026-06-19

### Features
- add display_name field to connection form and getDisplayTitle utility ([`add2520`](https://github.com/Ssentiago/l2tp-hub/commit/add25204fb7f24403fcb77eb43e836bc357dfec5))
- add display_name field to Connection with priority-based display_title() ([`864128a`](https://github.com/Ssentiago/l2tp-hub/commit/864128a0c3a490bb6fda39127fa1f43fbae8e88f))
- add workspace selector with create/rename/delete ([`a4d6f67`](https://github.com/Ssentiago/l2tp-hub/commit/a4d6f67c27ca4298d2288f7bb54fb233ccd55d3c))
- add workspace API and WorkspaceInfo type ([`2fbdbd8`](https://github.com/Ssentiago/l2tp-hub/commit/2fbdbd80539fdba0e6cbb99f8e972f8bde7deb94))
- add workspace CRUD commands (create/rename/delete/switch/list) ([`07f7dea`](https://github.com/Ssentiago/l2tp-hub/commit/07f7deaf70834dc87af8c588e110277a916022cb))
- add Workspace model, migrate Store to per-workspace connections ([`e7a5383`](https://github.com/Ssentiago/l2tp-hub/commit/e7a53839f36d4eba7dae134c62af0f7b23ecbb59))

## [0.5.0] - 2026-06-18

### Features
- add self-update with GitHub releases check ([`c519d25`](https://github.com/Ssentiago/l2tp-hub/commit/c519d251a80fc5403f7094cb903e9fe34eac0d77))

## [0.4.0] - 2026-06-18

### Features
- show company and branch in active connection label ([`b1a9cd2`](https://github.com/Ssentiago/l2tp-hub/commit/b1a9cd23ed67ced669fda9217baf9b3039cfc877))

## [0.3.1] - 2026-06-18

### Bug Fixes
- add tray status poller and refresh after connect/disconnect ([`9786f44`](https://github.com/Ssentiago/l2tp-hub/commit/9786f44da3eb90cf10b7f8693d518d613f65fa0b))

## [0.3.0] - 2026-06-13

### Features
- add tray module with system tray support ([`bbf59e1`](https://github.com/Ssentiago/l2tp-hub/commit/bbf59e1a0fffa0b14e0b84a0337dd805e30d09e1))

### Bug Fixes
- clone AppHandle before spawn_blocking to avoid borrow-after-move ([`0719d7f`](https://github.com/Ssentiago/l2tp-hub/commit/0719d7f6fc20e2eb92f003a41563e378c4d7e4ba))
- remove unused imports and fix type inference errors ([`5f44d8e`](https://github.com/Ssentiago/l2tp-hub/commit/5f44d8e455a1a11c2c8d3705ebe7a053dbce6629))

## [0.2.0] - 2026-06-04

### Features
- group connections by company with collapsible rows ([`a6169aa`](https://github.com/Ssentiago/l2tp-hub/commit/a6169aa831b85c591a0d973bc9be865386229833))

## [0.1.0] - 2026-05-20

Initial release of L2TP Hub — a cross-platform manager for L2TP/IPSec VPN connections on macOS and Windows.

Features:
- Connect/disconnect VPN connections in one click
- Labels for categorizing connections
- Filter and sort by status, priority, and labels
- Config export/import with AES-256-GCM encryption
- Passwords stored in system keychain (Keychain / Windows Credential Manager)

