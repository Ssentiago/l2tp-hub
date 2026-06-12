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

