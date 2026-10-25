use std::fs;
use std::path::PathBuf;

use crate::env::global_env;
use crate::executor::PrivilegedExecutor;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

pub const CHARON_LABEL: &str = "com.sentiago.l2tp-hub.charon";
pub const XL2TPD_LABEL: &str = "com.sentiago.l2tp-hub.xl2tpd";
pub const GUARDIAN_LABEL: &str = "com.sentiago.l2tp-hub.guardian";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

pub fn config_dir(name: &str) -> PathBuf {
    let base = global_env().config_dir(name);
    fs::create_dir_all(&base).ok();
    base
}

/// Фиксированная директория для активного конфига.
pub fn active_dir() -> PathBuf {
    PathBuf::from("/private/var/root/l2tp-hub/active")
}

/// Создать active dir с правами 700 (только root)
pub fn ensure_active_dir(executor: &dyn PrivilegedExecutor) -> Result<(), String> {
    let dir = active_dir();
    executor.run(&["mkdir", "-p", &dir.to_string_lossy()])?;
    executor.run(&["chmod", "700", &dir.to_string_lossy()])?;
    executor.run(&["chown", "root:wheel", &dir.to_string_lossy()])?;
    Ok(())
}

pub fn find_resource(relative: &str) -> PathBuf {
    let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join(relative);
    if dev_path.exists() {
        return dev_path;
    }
    global_env().resource_dir.join(relative)
}

pub fn charon_bin() -> PathBuf {
    find_resource("ipsec/charon")
}

pub fn swanctl_bin() -> PathBuf {
    find_resource("ipsec/swanctl")
}

pub fn xl2tpd_bin() -> PathBuf {
    find_resource("xl2tpd/xl2tpd")
}

pub fn charon_lib_dir() -> PathBuf {
    charon_bin().parent().unwrap().to_path_buf()
}

pub fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '_' })
        .collect()
}

pub fn plist_path(label: &str) -> PathBuf {
    PathBuf::from(format!("/Library/LaunchDaemons/{}.plist", label))
}

pub fn guardian_bin() -> PathBuf {
    find_resource("guardian/l2tp-hub-guardian")
}

pub fn guardian_plist_resource() -> PathBuf {
    find_resource("guardian/com.sentiago.l2tp-hub.guardian.plist")
}
