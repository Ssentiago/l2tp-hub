# L2TP Hub

A desktop manager for L2TP/IPSec VPN connections on macOS, built for IT professionals who work across many client networks.

The built-in macOS L2TP manager is clunky and inconvenient. L2TP Hub replaces it with a fast, keyboard-driven manager that keeps many connections in one place and credentials in the system keychain.

## Features

- One-click connect and disconnect
- Several connections at the same time: split tunnels run in parallel, full tunnel is exclusive
- Split tunnel, where only selected subnets go through the VPN, and full tunnel, where all traffic does
- Workspaces and labels to organize connections by company and branch
- Search, grouping, and sorting
- Passwords stored in the system keychain (macOS Keychain)
- Encrypted config export and import (AES-256-GCM)
- Session logs and connection history
- Automatic reconnect after sleep and wake
- Health check with an ICMP ping and an ISAKMP probe
- Global hotkey to show and hide the window

## How it works

The tunnel is built in userspace from a bundled strongSwan (charon) and xl2tpd over the system pppd. On macOS the VPN daemons run as LaunchDaemons and are controlled through small privileged helpers, so no external VPN tools need to be installed.

## Requirements

- macOS 13 or later

## Development

```bash
bun run tauri dev
```

## Build

The full build compiles the bundled VPN stack (strongSwan and xl2tpd) and the privileged helper and guardian daemons, then packages the app. It needs Bun, Rust, and the Xcode Command Line Tools on macOS.

```bash
bun run build:all
```

To package only the app once the VPN stack already sits in `src-tauri/resources`:

```bash
bun run tauri build
```

## Documentation

Developer documentation lives in the `docs/` directory. `AGENTS.md` describes the architecture, the crates, and the working conventions.

## License

Distributed under the terms in [LICENSE](LICENSE).
