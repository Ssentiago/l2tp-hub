// Проверка того, кто подключился к сокету helper.
// Разрешены root и владелец консоли: приложение запускается под
// залогиненным пользователем, остальные логины системы не должны получать
// выполнение команд от root.
//
// Для получения uid пира используется getpeereid: getsockopt LOCAL_PEERCRED
// на современных macOS возвращает пустой xucred (заполняется только
// cr_version), поэтому непригоден.

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

/// Проверяет подключение: возвращает uid пира или причину отказа.
pub fn peer_allowed(stream: &UnixStream) -> Result<u32, String> {
    let uid = peer_uid(stream)?;
    if uid == 0 {
        return Ok(uid);
    }
    match console_uid() {
        Some(console) if console == uid => Ok(uid),
        Some(console) => Err(format!(
            "uid {} rejected: console user is uid {}",
            uid, console
        )),
        None => Err(format!("uid {} rejected: console user unknown", uid)),
    }
}

#[cfg(test)]
mod tests {
    use super::peer_allowed;

    #[test]
    fn own_connection_is_allowed() {
        let path = std::env::temp_dir().join(format!(
            "l2tp-hub-peercred-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let listener = std::os::unix::net::UnixListener::bind(&path).unwrap();
        let client = std::os::unix::net::UnixStream::connect(&path).unwrap();
        let (server, _) = listener.accept().unwrap();

        let uid = peer_allowed(&server).expect("own uid must pass the check");
        assert_eq!(uid, unsafe { libc::getuid() });

        drop(client);
        let _ = std::fs::remove_file(&path);
    }
}
