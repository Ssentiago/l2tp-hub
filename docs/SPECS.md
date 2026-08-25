# L2TP Hub — Global Specs

## Spec 1: Helper Version Check (auto-update on version mismatch)

### Problem
When the app updates, the new GUI may expect a different helper protocol version, but the old helper daemon is still running in `/Library/PrivilegedHelperTools/`. Without explicit version checking, protocol mismatch between GUI and daemon causes silent failures.

### Implementation

**1. Version constant in helper binary:**
```rust
// helper/src/main.rs
const HELPER_VERSION: &str = env!("CARGO_PKG_VERSION");
```

**2. New `version` command in helper protocol:**
```rust
// helper/src/main.rs — command handler
match command {
    ["version"] => respond(HELPER_VERSION),
    // ... other commands
}
```

**3. Version check at GUI startup (before first use):**
```rust
async fn ensure_helper_up_to_date(app: &AppHandle) -> Result<(), String> {
    const EXPECTED_VERSION: &str = env!("CARGO_PKG_VERSION");

    if !helper_installed() {
        install_helper(app)?;
        return Ok(());
    }

    let installed_version = query_helper_version().await;

    match installed_version {
        Ok(v) if v == EXPECTED_VERSION => Ok(()),
        Ok(v) => {
            log!("[helper] version mismatch: installed={}, expected={}", v, EXPECTED_VERSION);
            reinstall_helper(app).await
        }
        Err(_) => {
            // Old helper doesn't know `version` command — treat as outdated
            log!("[helper] version query failed, assuming outdated, reinstalling");
            reinstall_helper(app).await
        }
    }
}

async fn reinstall_helper(app: &AppHandle) -> Result<(), String> {
    let _ = Command::new("launchctl")
        .args(["bootout", "system/com.sentiago.l2tp-hub.helper"])
        .output();
    install_helper(app)
}
```

**4. Backward compatibility:** The first version of the helper (already installed) won't know the `version` command. `query_helper_version()` must treat any error/timeout as "unknown version → needs reinstall", not crash.

**Order of work:** Add `version` command + constant to helper, rebuild, manually reinstall once. All subsequent updates auto-detected via this mechanism.

---

## Spec 2: Connect Error Classification (distinguish failure reasons)

### Problem
Failed `connect_vpn()` shows generic "Failed to connect" for all scenarios: server unreachable, wrong PSK, wrong password, incompatible DH group. User can't diagnose.

### Error Categories

```rust
enum ConnectError {
    ServerUnreachable,      // timeout, no response at all
    AuthenticationFailed,   // IKE PSK reject
    NoProposalChosen,       // incompatible algorithms (DH group/hash mismatch)
    PppAuthFailed,          // wrong username/password at PPP level
    Unknown(String),        // fallback with raw error text
}
```

### Log Pattern Matching (strongSwan 6.0.7 specific)

strongSwan writes **text messages**, not just RFC constant names. Match both variants:

```rust
fn classify_connect_failure(charon_log: &str, pppd_log: &str) -> ConnectError {
    if charon_log.contains("NO_PROPOSAL_CHOSEN")
        || charon_log.contains("no proposal found")
        || charon_log.contains("no acceptable proposal found") {
        return ConnectError::NoProposalChosen;
    }
    if charon_log.contains("AUTHENTICATION_FAILED")
        || (charon_log.contains("authentication of") && charon_log.contains("failed"))
        || charon_log.contains("INVALID_ID_INFORMATION") {
        return ConnectError::AuthenticationFailed;
    }
    if pppd_log.contains("CHAP authentication failed")
        || pppd_log.contains("PAP authentication failed") {
        return ConnectError::PppAuthFailed;
    }
    if charon_log.contains("giving up after")
        || charon_log.contains("retransmit")
        || !charon_log.contains("received packet") {
        return ConnectError::ServerUnreachable;
    }
    ConnectError::Unknown(charon_log.to_string())
}
```

### User-Facing Messages

| Error | Message |
|-------|---------|
| `ServerUnreachable` | "Сервер не отвечает. Проверьте адрес сервера и подключение к интернету." |
| `AuthenticationFailed` | "Неверный общий ключ (PSK). Проверьте настройки подключения." |
| `NoProposalChosen` | "Сервер не поддерживает используемые алгоритмы шифрования. Обратитесь к администратору сети." |
| `PppAuthFailed` | "Неверное имя пользователя или пароль." |
| `Unknown` | Generic fallback with raw text logged for debugging |

### Event Payload Extension

```rust
struct VpnStatusPayload {
    status: VpnStatus,
    connected_since: Option<u64>,
    error: Option<ConnectError>, // filled only on Disconnected due to error
}
```

### Full IKEv2 Notify Reference (strongSwan 6.0.7)

#### RFC 7296 §3.10.1 Error Types

| Code | Name | Log appearance | Meaning |
|------|------|----------------|---------|
| 1 | UNSUPPORTED_CRITICAL_PAYLOAD | `UNSUPPORTED_CRITICAL_PAYLOAD` | Peer didn't understand critical payload |
| 4 | INVALID_IKE_SPI | `INVALID_IKE_SPI` | Wrong SPI, usually stale SA |
| 5 | INVALID_MAJOR_VERSION | `INVALID_MAJOR_VERSION` | IKE version mismatch (v1 vs v2) |
| 7 | INVALID_SYNTAX | `INVALID_SYNTAX` | Malformed packet |
| 9 | INVALID_MESSAGE_ID | `INVALID_MESSAGE_ID` | Message ID desync (retransmit issues) |
| 11 | INVALID_SPI | `INVALID_SPI` | Wrong ESP/AH SPI |
| 14 | NO_PROPOSAL_CHOSEN | `NO_PROPOSAL_CHOSEN` / `received NO_PROPOSAL_CHOSEN error notify` | Incompatible algorithms/DH group |
| 17 | INVALID_KE_PAYLOAD | `INVALID_KE_PAYLOAD` | DH group in KE doesn't match selected SA |
| 24 | AUTHENTICATION_FAILED | `AUTHENTICATION_FAILED` | General auth failure (PSK/cert/EAP) |
| 34 | SINGLE_PAIR_REQUIRED | `SINGLE_PAIR_REQUIRED` | Requires single traffic selector pair |
| 35 | NO_ADDITIONAL_SAS | `NO_ADDITIONAL_SAS` | Peer refuses additional Child SAs |
| 36 | INTERNAL_ADDRESS_FAILURE | `INTERNAL_ADDRESS_FAILURE` | Failed to assign internal IP |
| 37 | FAILED_CP_REQUIRED | `FAILED_CP_REQUIRED` | Required Configuration Payload missing |
| 38 | TS_UNACCEPTABLE | `TS_UNACCEPTABLE` | Traffic selectors rejected |
| 39 | INVALID_SELECTORS | `INVALID_SELECTORS` | Invalid TS in packet |
| 43 | TEMPORARY_FAILURE | `TEMPORARY_FAILURE` | Peer temporarily busy (rekey collision) |
| 44 | CHILD_SA_NOT_FOUND | `CHILD_SA_NOT_FOUND` | Reference to nonexistent Child SA |

#### strongSwan-Specific Text Markers (not RFC constants)

| Log string | Meaning |
|------------|---------|
| `no IKE config found for X...Y, sending NO_PROPOSAL_CHOSEN` | Server has no config for this peer IP |
| `IDir '...' does not match to '...'` | Peer ID mismatch (Peer ID / NAT) |
| `looking for pre-shared key peer configs matching ...` | Charon searching PSK config — if nothing follows, PSK not configured |
| `authentication of '...' with PSK failed` / `authentication of '...' (myself) failed` | Explicit PSK failure |
| `no acceptable proposal found` | Same as NO_PROPOSAL_CHOSEN, initiator-side (before sending) |
| `retransmit N of request` ... `giving up after N retransmits` | Server unreachable — timeout |
| `establishing connection failed` | Generic wrapper, usually last line after one of the above |
| `received XAuth request` / `XAuth authentication ... failed` | XAuth failure (IKEv1 Cisco-compat mode) |

#### PPP-Level (pppd, not charon)

| pppd log string | Meaning |
|-----------------|---------|
| `CHAP authentication failed` | Wrong login/password at PPP level |
| `PAP authentication failed` | Same for PAP |
| `LCP terminated by peer` | Server killed session before auth |
| `Peer not responding` | PPP negotiation timeout |

### Order of work
1. Collect real log samples for each failure case (wrong PSK, wrong password, unreachable server)
2. Verify that regex/string patterns actually appear in strongSwan 6.0.7 logs (version-specific formatting)
3. Implement `classify_connect_failure` with verified patterns
4. Extend `vpn-status-changed` event payload with error field
5. Frontend: show specific error messages per category
