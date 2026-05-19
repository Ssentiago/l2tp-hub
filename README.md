# L2TP Hub

A manager for L2TP/IPSec VPN connections on macOS and Windows. Built for IT professionals who work with many client
networks.

## Features

- One-click connect and disconnect
- Labels for categorizing connections (company, branch, etc.)
- Filter and sort by status, priority, and labels
- Config export/import with AES-256-GCM encryption
- Passwords stored in the system keychain (Keychain / Windows Credential Manager)

## Requirements

- macOS 13–15 (macOS 26 Tahoe is not supported — L2TP was removed from the OS)
- Windows 10/11
- macOS: [macosvpn](https://github.com/halo/macosvpn) — `brew install macosvpn`

## Build

```bash
bun run tauri build
```

## Development

```bash
bun run tauri dev
```