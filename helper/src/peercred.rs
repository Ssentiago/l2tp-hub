// Проверка того, кто подключился к сокету helper.
// Разрешены root и владелец консоли: приложение запускается под
// залогиненным пользователем, остальные логины системы не должны получать
// выполнение команд от root.
//
// Для получения uid пира используется getpeereid: getsockopt LOCAL_PEERCRED
// на современных macOS возвращает пустой xucred (заполняется только
// cr_version), поэтому непригоден.
//
// В релизной сборке дополнительно проверяется кодовая подпись пира. Проверка
// привязана к audit token (getsockopt LOCAL_PEERTOKEN), а не к pid: токен
// принадлежит конкретному экземпляру процесса и не оставляет гонку
// переиспользования pid между accept и проверкой. Подпись сверяется с
// требованием из файла доверия, который пишет root при установке helper
// (см. TRUST_FILE). В debug-сборке проверка подписи не компилируется:
// dev-приложение не подписано и работает через отдельный dev-helper.

use std::os::fd::AsRawFd;
use std::os::unix::net::UnixStream;

fn peer_uid(stream: &UnixStream) -> Result<u32, String> {
    let mut uid: libc::uid_t = 0;
    let mut gid: libc::gid_t = 0;
    let rc = unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) };
    if rc != 0 {
        return Err(format!(
            "getpeereid: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(uid)
}

/// UID консольного пользователя: владелец /dev/console.
fn console_uid() -> Option<u32> {
    use std::os::unix::fs::MetadataExt;
    std::fs::metadata("/dev/console").ok().map(|m| m.uid())
}

/// Проверка uid пира: root и владелец консоли разрешены.
fn uid_allowed(uid: u32) -> Result<(), String> {
    if uid == 0 {
        return Ok(());
    }
    match console_uid() {
        Some(console) if console == uid => Ok(()),
        Some(console) => Err(format!(
            "uid {} rejected: console user is uid {}",
            uid, console
        )),
        None => Err(format!("uid {} rejected: console user unknown", uid)),
    }
}

/// Проверяет подключение: возвращает uid пира или причину отказа.
pub fn peer_allowed(stream: &UnixStream) -> Result<u32, String> {
    let uid = peer_uid(stream)?;
    uid_allowed(uid)?;
    verify_signature(stream)?;
    Ok(uid)
}

// --- Проверка кодовой подписи (только релизная сборка) ---

#[cfg(not(debug_assertions))]
const SOL_LOCAL: libc::c_int = 0;

#[cfg(not(debug_assertions))]
const LOCAL_PEERTOKEN: libc::c_int = 0x006;

/// Файл доверия: требование к кодовой подписи клиента в синтаксисе
/// Code Signing Requirement Language, например
/// `identifier "com.sentiago.l2tp-hub" and cdhash H"..."`.
/// Пишется root при установке helper, см. sudo.rs в src-tauri.
#[cfg(not(debug_assertions))]
const TRUST_FILE: &str = "/Library/PrivilegedHelperTools/l2tp-hub-helper.trust";

/// Audit token пира: 8 слов по 4 байта.
#[cfg(not(debug_assertions))]
fn peer_audit_token(stream: &UnixStream) -> Result<[u8; 32], String> {
    let mut token = [0u8; 32];
    let mut len = token.len() as libc::socklen_t;
    let rc = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            SOL_LOCAL,
            LOCAL_PEERTOKEN,
            token.as_mut_ptr().cast(),
            &mut len,
        )
    };
    if rc != 0 {
        return Err(format!(
            "LOCAL_PEERTOKEN: {}",
            std::io::Error::last_os_error()
        ));
    }
    if len as usize != token.len() {
        return Err(format!(
            "LOCAL_PEERTOKEN: unexpected token length {}",
            len
        ));
    }
    Ok(token)
}

/// Сверяет кодовую подпись пира с требованием из файла доверия.
#[cfg(not(debug_assertions))]
fn verify_signature(stream: &UnixStream) -> Result<(), String> {
    use core_foundation::base::TCFType;
    use core_foundation::data::CFData;
    use security_framework::os::macos::code_signing::{
        Flags, GuestAttributes, SecCode, SecRequirement,
    };

    let text = std::fs::read_to_string(TRUST_FILE)
        .map_err(|e| format!("trust file {}: {}", TRUST_FILE, e))?;
    let requirement: SecRequirement = text
        .trim()
        .parse()
        .map_err(|e| format!("bad requirement in {}: {}", TRUST_FILE, e))?;

    let token = peer_audit_token(stream)?;
    let token_data = CFData::from_buffer(&token);
    let mut attrs = GuestAttributes::new();
    attrs.set_audit_token(token_data.as_concrete_TypeRef());

    let code = SecCode::copy_guest_with_attribues(None, &attrs, Flags::NONE)
        .map_err(|e| format!("code lookup by audit token: {}", e))?;
    code.check_validity(Flags::NONE, &requirement)
        .map_err(|e| format!("signature check failed: {}", e))
}

/// Debug-сборка: подпись не проверяется. Dev-helper обслуживает только
/// неподписанное dev-приложение и живёт на отдельном сокете.
#[cfg(debug_assertions)]
fn verify_signature(_stream: &UnixStream) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{peer_uid, uid_allowed};

    #[test]
    fn own_connection_passes_uid_check() {
        let path = std::env::temp_dir().join(format!(
            "l2tp-hub-peercred-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let listener = std::os::unix::net::UnixListener::bind(&path).unwrap();
        let client = std::os::unix::net::UnixStream::connect(&path).unwrap();
        let (server, _) = listener.accept().unwrap();

        let uid = peer_uid(&server).expect("own uid must be readable");
        assert_eq!(uid, unsafe { libc::getuid() });
        uid_allowed(uid).expect("own uid must pass the check");

        drop(client);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn root_uid_is_allowed() {
        uid_allowed(0).expect("root must pass the check");
    }

    #[test]
    fn foreign_uid_is_rejected() {
        // Заведомо несуществующий uid: не владелец консоли и не root.
        assert!(uid_allowed(499_499).is_err());
    }
}
