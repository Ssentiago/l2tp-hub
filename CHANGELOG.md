## [0.8.0] - 2026-08-13

### Features
- show spinner on health-check button while running ([`ad7b55c`](https://github.com/Ssentiago/l2tp-hub/commit/ad7b55cf5159136df014c4a76be4e0d6d15145d7))

## [0.7.0] - 2026-08-13

### Features
- migrate from JSON file storage to SQLite via sqlx ([`954c486`](https://github.com/Ssentiago/l2tp-hub/commit/954c486132da78cc797ff32af4af4dbd003997bc))
- connection history and live uptime stats ([`0a0c49e`](https://github.com/Ssentiago/l2tp-hub/commit/0a0c49e634f736bd0d6187e29b8b6a430ebf44fb))
- health-check now combines ISAKMP probe + ICMP ping ([`c564b02`](https://github.com/Ssentiago/l2tp-hub/commit/c564b02ae9a7c08f336a2cc8c94b21dae6f0c3a3))
- L2TP health-check via ISAKMP SA_INIT probe ([`25dc7c8`](https://github.com/Ssentiago/l2tp-hub/commit/25dc7c85041c2347c76caf104edeec6390483eff))
- instant tray-to-UI status sync ([`555f9dd`](https://github.com/Ssentiago/l2tp-hub/commit/555f9dd23a5b5627a314ba274ef9dc2dc19e6cf0))
- configurable connection grouping in table ([`3985b4e`](https://github.com/Ssentiago/l2tp-hub/commit/3985b4e120dc3cfae2a07239a45e4e10290c919d))
- real-time VPN status via Tauri events instead of polling ([`26fba93`](https://github.com/Ssentiago/l2tp-hub/commit/26fba93c942800e39b8703f1ec821fb351c65bcd))
- add status and label filter dropdowns to connection list ([`6875ded`](https://github.com/Ssentiago/l2tp-hub/commit/6875dedd4f580e885ad528c54dff7af3c58d0505))
- add full loading states to all async operations ([`0809ba9`](https://github.com/Ssentiago/l2tp-hub/commit/0809ba99c026b4f46a8626910e0ad16778d5af5a))

### Bug Fixes
- resolve block_on deadlocks, restore SudoModal on startup, remove frontend cache ([`7fce5a7`](https://github.com/Ssentiago/l2tp-hub/commit/7fce5a7350af9ae0bbba0c66d809b8828db418f5))
- config import — file picker first, then password dialog ([`0522cee`](https://github.com/Ssentiago/l2tp-hub/commit/0522cee6cf0631a79f6cb516b86550f95b9d12d0))
- minor UX polish — empty states, form hint, CSP ([`18cac1b`](https://github.com/Ssentiago/l2tp-hub/commit/18cac1b63f4e8a040b11cf829174496d4713c6ea))
- remaining consistency fixes ([`befcced`](https://github.com/Ssentiago/l2tp-hub/commit/befcced4169cfe5f7cc882da4c3a18475f6d1bf7))
- accessibility improvements — userSelect, aria-labels ([`159502b`](https://github.com/Ssentiago/l2tp-hub/commit/159502b91404916952d3014f74e6f3fcaf6362af))
- add error handling with toast notifications to all async handlers ([`c54f935`](https://github.com/Ssentiago/l2tp-hub/commit/c54f9358f729b706a83dde4aca37ceca683e3ea2))

### Refactoring
- migrate to zustand state manager ([`8b07763`](https://github.com/Ssentiago/l2tp-hub/commit/8b07763bed9d6283f1f610dfbdc9b694d5d24205))

## [0.7.0] - 2026-08-13

### Features
- migrate from JSON file storage to SQLite via sqlx ([`954c486`](https://github.com/Ssentiago/l2tp-hub/commit/954c486132da78cc797ff32af4af4dbd003997bc))
- connection history and live uptime stats ([`0a0c49e`](https://github.com/Ssentiago/l2tp-hub/commit/0a0c49e634f736bd0d6187e29b8b6a430ebf44fb))
- health-check now combines ISAKMP probe + ICMP ping ([`c564b02`](https://github.com/Ssentiago/l2tp-hub/commit/c564b02ae9a7c08f336a2cc8c94b21dae6f0c3a3))
- L2TP health-check via ISAKMP SA_INIT probe ([`25dc7c8`](https://github.com/Ssentiago/l2tp-hub/commit/25dc7c85041c2347c76caf104edeec6390483eff))
- instant tray-to-UI status sync ([`555f9dd`](https://github.com/Ssentiago/l2tp-hub/commit/555f9dd23a5b5627a314ba274ef9dc2dc19e6cf0))
- configurable connection grouping in table ([`3985b4e`](https://github.com/Ssentiago/l2tp-hub/commit/3985b4e120dc3cfae2a07239a45e4e10290c919d))
- real-time VPN status via Tauri events instead of polling ([`26fba93`](https://github.com/Ssentiago/l2tp-hub/commit/26fba93c942800e39b8703f1ec821fb351c65bcd))
- add status and label filter dropdowns to connection list ([`6875ded`](https://github.com/Ssentiago/l2tp-hub/commit/6875dedd4f580e885ad528c54dff7af3c58d0505))
- add full loading states to all async operations ([`0809ba9`](https://github.com/Ssentiago/l2tp-hub/commit/0809ba99c026b4f46a8626910e0ad16778d5af5a))

### Bug Fixes
- resolve block_on deadlocks, restore SudoModal on startup, remove frontend cache ([`74bb0f2`](https://github.com/Ssentiago/l2tp-hub/commit/74bb0f2eb7aff80703efd2d4d94b58fa8cef04fd))
- config import — file picker first, then password dialog ([`0522cee`](https://github.com/Ssentiago/l2tp-hub/commit/0522cee6cf0631a79f6cb516b86550f95b9d12d0))
- minor UX polish — empty states, form hint, CSP ([`18cac1b`](https://github.com/Ssentiago/l2tp-hub/commit/18cac1b63f4e8a040b11cf829174496d4713c6ea))
- remaining consistency fixes ([`befcced`](https://github.com/Ssentiago/l2tp-hub/commit/befcced4169cfe5f7cc882da4c3a18475f6d1bf7))
- accessibility improvements — userSelect, aria-labels ([`159502b`](https://github.com/Ssentiago/l2tp-hub/commit/159502b91404916952d3014f74e6f3fcaf6362af))
- add error handling with toast notifications to all async handlers ([`c54f935`](https://github.com/Ssentiago/l2tp-hub/commit/c54f9358f729b706a83dde4aca37ceca683e3ea2))

### Refactoring
- migrate to zustand state manager ([`8b07763`](https://github.com/Ssentiago/l2tp-hub/commit/8b07763bed9d6283f1f610dfbdc9b694d5d24205))

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

