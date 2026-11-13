// Allowlist for commands executed by the helper as root.
// Only the exact command shapes the application sends are accepted,
// anything else is rejected before execution. Command shapes used by
// l2tp-hub-core must be mirrored here when they change.

const GUARDIAN_BIN: &str = "/Library/PrivilegedHelperTools/l2tp-hub-guardian";

const LAUNCHD_LABELS: [&str; 3] = [
    "com.sentiago.l2tp-hub.charon",
    "com.sentiago.l2tp-hub.xl2tpd",
    "com.sentiago.l2tp-hub.guardian",
];

const PKILL_TARGETS: [&str; 3] = ["charon", "xl2tpd", "pppd"];

const PKILL_FLAGS: [&str; 3] = ["-9", "-TERM", "-f"];

const KILL_SIGNALS: [&str; 4] = ["SIGTERM", "SIGKILL", "SIGINT", "SIGHUP"];

// Literal shell snippets sent by l2tp-hub-core via "bash -c". Anything
// outside this list is rejected, so the shell can never be used to run
// arbitrary root commands.
const BASH_SNIPPETS: [&str; 4] = [
    "lsof -ti :500 | xargs kill -9 2>/dev/null; true",
    "lsof -ti :4500 | xargs kill -9 2>/dev/null; true",
    "test -p /var/run/xl2tpd/l2tp-control || mkfifo /var/run/xl2tpd/l2tp-control",
    "echo 'nodetach' > /etc/ppp/options",
];

// Path prefixes are matched on path boundary: the prefix itself or the
// prefix followed by "/". Absolute paths only, no ".." components.
const RM_PREFIXES: [&str; 3] = [
    "/var/run",
    "/private/var/root/l2tp-hub",
    "/Library/LaunchDaemons",
];

const CHMOD_PREFIXES: [&str; 5] = [
    "/private/var/root/l2tp-hub",
    "/var/run",
    "/etc/ppp",
    "/Library/LaunchDaemons",
    "/Library/PrivilegedHelperTools",
];

const MKDIR_PREFIXES: [&str; 3] = [
    "/private/var/root/l2tp-hub",
    "/var/run",
    "/etc/ppp",
];

const CAT_PREFIXES: [&str; 1] = ["/private/var/root/l2tp-hub"];

const CP_DST_PREFIXES: [&str; 5] = [
    "/private/var/root/l2tp-hub",
    "/etc/ppp",
    "/var/run",
    "/Library/LaunchDaemons",
    "/Library/PrivilegedHelperTools",
];

const CP_SRC_PREFIXES: [&str; 7] = [
    "/Users",
    "/Applications",
    "/private/var/root/l2tp-hub",
    "/var/folders",
    "/tmp",
    "/var/run",
    "/Library",
];

const ENV_CONF_PREFIXES: [&str; 1] = ["/private/var/root/l2tp-hub"];

/// Проверяет argv целиком: либо Ok(()), либо причина отказа.
pub fn check(args: &[String]) -> Result<(), String> {
    let cmd = match args.first() {
        Some(c) => c.as_str(),
        None => return Err("empty command".to_string()),
    };

    match cmd {
        "version" => expect_len(args, 1),
        "true" => expect_len(args, 1),
        "guardian_start" => check_guardian_start(&args[1..]),
        "cp" => check_cp(&args[1..]),
        "chmod" => check_chmod(&args[1..]),
        "chown" => check_chown(&args[1..]),
        "mkdir" => check_mkdir(&args[1..]),
        "rm" => check_rm(&args[1..]),
        "cat" => check_cat(&args[1..]),
        "route" => check_route(&args[1..]),
        "ifconfig" => check_ifconfig(&args[1..]),
        "pkill" => check_pkill(&args[1..]),
        "bash" => check_bash(&args[1..]),
        "env" => check_env(&args[1..]),
        "launchctl" => check_launchctl(&args[1..]),
        other => Err(format!("command not allowed: {}", other)),
    }
}

fn expect_len(args: &[String], n: usize) -> Result<(), String> {
    if args.len() == n {
        Ok(())
    } else {
        Err(format!("expected {} args, got {}", n, args.len()))
    }
}

fn clean_abs(p: &str) -> bool {
    p.starts_with('/') && !p.contains('\0') && !p.split('/').any(|c| c == "..")
}

fn under(p: &str, prefixes: &[&str]) -> bool {
    clean_abs(p)
        && prefixes
            .iter()
            .any(|pre| p == *pre || p.starts_with(&format!("{}/", pre)))
}

fn path_arg(p: &str, prefixes: &[&str], ctx: &str) -> Result<(), String> {
    if under(p, prefixes) {
        Ok(())
    } else {
        Err(format!("{}: path not allowed: {}", ctx, p))
    }
}

/// Токен для значений route: начинается с буквы или цифры, дальше только
/// безопасные символы адресов и имён интерфейсов.
fn is_net_token(s: &str) -> bool {
    !s.is_empty()
        && s.chars().next().map(|c| c.is_ascii_alphanumeric()) == Some(true)
        && s
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | ':' | '/' | '-' | '_'))
}

/// Имя SA для swanctl --terminate: как sanitize_name в ядре.
fn is_sa_name(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

fn is_octal_mode(m: &str) -> bool {
    (3..=4).contains(&m.len()) && m.chars().all(|c| ('0'..='7').contains(&c))
}

/// Срезает необязательный "-R" в начале (chmod/chown).
fn strip_recursive(rest: &[String]) -> Result<&[String], String> {
    match rest.first() {
        Some(f) if f == "-R" => Ok(&rest[1..]),
        Some(f) if f.starts_with('-') => Err(format!("unexpected flag: {}", f)),
        _ => Ok(rest),
    }
}

fn check_guardian_start(rest: &[String]) -> Result<(), String> {
    let bin = rest.first().ok_or("guardian_start: missing binary path")?;
    if bin != GUARDIAN_BIN {
        return Err(format!("guardian_start: binary not allowed: {}", bin));
    }
    for arg in &rest[1..] {
        let ok = !arg.is_empty()
            && arg.chars().all(|c| {
                c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | '/' | ':' | '=')
            });
        if !ok {
            return Err(format!("guardian_start: bad argument: {}", arg));
        }
    }
    Ok(())
}

fn check_cp(rest: &[String]) -> Result<(), String> {
    expect_len(rest, 2)?;
    path_arg(&rest[0], &CP_SRC_PREFIXES, "cp src")?;
    path_arg(&rest[1], &CP_DST_PREFIXES, "cp dst")
}

fn check_chmod(rest: &[String]) -> Result<(), String> {
    let args = strip_recursive(rest)?;
    expect_len(args, 2)?;
    if !is_octal_mode(&args[0]) {
        return Err(format!("chmod: bad mode: {}", args[0]));
    }
    path_arg(&args[1], &CHMOD_PREFIXES, "chmod")
}

fn check_chown(rest: &[String]) -> Result<(), String> {
    let args = strip_recursive(rest)?;
    expect_len(args, 2)?;
    if args[0] != "root:wheel" {
        return Err(format!("chown: owner not allowed: {}", args[0]));
    }
    path_arg(&args[1], &CHMOD_PREFIXES, "chown")
}

fn check_mkdir(rest: &[String]) -> Result<(), String> {
    if rest.len() == 2 && rest[0] == "-p" {
        path_arg(&rest[1], &MKDIR_PREFIXES, "mkdir")
    } else {
        Err("mkdir: expected -p <dir>".to_string())
    }
}

fn check_rm(rest: &[String]) -> Result<(), String> {
    let (flag, paths) = rest.split_first().ok_or("rm: missing arguments")?;
    if flag != "-f" && flag != "-rf" && flag != "-r" {
        return Err(format!("rm: flag not allowed: {}", flag));
    }
    if paths.is_empty() {
        return Err("rm: missing path".to_string());
    }
    for p in paths {
        path_arg(p, &RM_PREFIXES, "rm")?;
    }
    Ok(())
}

fn check_cat(rest: &[String]) -> Result<(), String> {
    expect_len(rest, 1)?;
    path_arg(&rest[0], &CAT_PREFIXES, "cat")
}

fn check_route(rest: &[String]) -> Result<(), String> {
    let (sub, tail) = rest.split_first().ok_or("route: missing subcommand")?;
    if sub != "add" && sub != "delete" && sub != "change" {
        return Err(format!("route: subcommand not allowed: {}", sub));
    }
    if tail.is_empty() {
        return Err("route: missing arguments".to_string());
    }
    for arg in tail {
        let ok = matches!(arg.as_str(), "default" | "-host" | "-net" | "-interface")
            || is_net_token(arg);
        if !ok {
            return Err(format!("route: bad argument: {}", arg));
        }
    }
    Ok(())
}

fn check_ifconfig(rest: &[String]) -> Result<(), String> {
    expect_len(rest, 2)?;
    if rest[1] != "destroy" {
        return Err(format!("ifconfig: action not allowed: {}", rest[1]));
    }
    let iface = &rest[0];
    if iface.is_empty()
        || iface.len() > 15
        || !iface.chars().all(|c| c.is_ascii_alphanumeric())
    {
        return Err(format!("ifconfig: bad interface: {}", iface));
    }
    Ok(())
}

fn check_pkill(rest: &[String]) -> Result<(), String> {
    let (pattern, flags) = rest.split_last().ok_or("pkill: missing arguments")?;
    if !PKILL_TARGETS.contains(&pattern.as_str()) {
        return Err(format!("pkill: target not allowed: {}", pattern));
    }
    if flags.is_empty() {
        return Err("pkill: missing flags".to_string());
    }
    for f in flags {
        if !PKILL_FLAGS.contains(&f.as_str()) {
            return Err(format!("pkill: flag not allowed: {}", f));
        }
    }
    Ok(())
}

fn check_bash(rest: &[String]) -> Result<(), String> {
    if rest.len() == 2 && rest[0] == "-c" && BASH_SNIPPETS.contains(&rest[1].as_str()) {
        Ok(())
    } else {
        Err("bash: only fixed -c snippets are allowed".to_string())
    }
}

fn check_env(rest: &[String]) -> Result<(), String> {
    // ["env", "STRONGSWAN_CONF=<conf>", "<swanctl>", ...swanctl args]
    if rest.len() < 3 {
        return Err("env: expected STRONGSWAN_CONF, swanctl, args".to_string());
    }
    let conf = rest[0]
        .strip_prefix("STRONGSWAN_CONF=")
        .ok_or_else(|| "env: expected STRONGSWAN_CONF=".to_string())?;
    path_arg(conf, &ENV_CONF_PREFIXES, "env STRONGSWAN_CONF")?;

    let swanctl = &rest[1];
    if !(clean_abs(swanctl) && swanctl.ends_with("/swanctl")) {
        return Err(format!("env: bad swanctl path: {}", swanctl));
    }

    match &rest[2..] {
        [a, b] if a == "--list-sas" && b == "--raw" => Ok(()),
        [a, b, c, d] if a == "--load-all" && b == "--noprompt" && c == "-f" => {
            path_arg(d, &ENV_CONF_PREFIXES, "env swanctl -f")
        }
        [a, b, c] if a == "--terminate" && b == "--ike" && is_sa_name(c) => Ok(()),
        other => Err(format!(
            "env: swanctl arguments not allowed: {}",
            other.join(" ")
        )),
    }
}

fn is_launchd_ref(s: &str) -> bool {
    s.strip_prefix("system/")
        .map(|label| LAUNCHD_LABELS.contains(&label))
        .unwrap_or(false)
}

fn check_launchctl(rest: &[String]) -> Result<(), String> {
    let (sub, tail) = rest.split_first().ok_or("launchctl: missing subcommand")?;
    match sub.as_str() {
        "bootout" | "kickstart" => {
            if tail.len() == 1 && is_launchd_ref(&tail[0]) {
                Ok(())
            } else {
                Err(format!("launchctl {}: bad label", sub))
            }
        }
        "bootstrap" => {
            if tail.len() != 2 || tail[0] != "system" {
                return Err("launchctl bootstrap: expected system <plist>".to_string());
            }
            let ok = LAUNCHD_LABELS
                .iter()
                .any(|label| tail[1] == format!("/Library/LaunchDaemons/{}.plist", label));
            if ok {
                Ok(())
            } else {
                Err(format!("launchctl bootstrap: bad plist: {}", tail[1]))
            }
        }
        "kill" => {
            if tail.len() == 2
                && KILL_SIGNALS.contains(&tail[0].as_str())
                && is_launchd_ref(&tail[1])
            {
                Ok(())
            } else {
                Err("launchctl kill: bad signal or label".to_string())
            }
        }
        other => Err(format!("launchctl: subcommand not allowed: {}", other)),
    }
}

#[cfg(test)]
mod tests {
    use super::check;

    fn v(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| s.to_string()).collect()
    }

    fn ok(parts: &[&str]) {
        assert!(check(&v(parts)).is_ok(), "should pass: {:?}", parts);
    }

    fn bad(parts: &[&str]) {
        assert!(check(&v(parts)).is_err(), "should fail: {:?}", parts);
    }

    const CONF: &str = "STRONGSWAN_CONF=/private/var/root/l2tp-hub/active/strongswan.conf";
    const SWANCTL: &str = "/Applications/L2TP Hub.app/Contents/Resources/ipsec/swanctl";

    #[test]
    fn allows_expected_shapes() {
        ok(&["version"]);
        ok(&["true"]);
        ok(&["guardian_start", "/Library/PrivilegedHelperTools/l2tp-hub-guardian"]);
        ok(&["guardian_start", "/Library/PrivilegedHelperTools/l2tp-hub-guardian", "--flag"]);
        ok(&["cp", "/tmp/x", "/private/var/root/l2tp-hub/route.state"]);
        ok(&["cp", "/Users/a/res/ip-up", "/etc/ppp/ip-up"]);
        ok(&["chmod", "600", "/var/run/xl2tpd/l2tp-control"]);
        ok(&["chmod", "-R", "600", "/private/var/root/l2tp-hub/active"]);
        ok(&["chown", "root:wheel", "/Library/LaunchDaemons/com.sentiago.l2tp-hub.charon.plist"]);
        ok(&["chown", "-R", "root:wheel", "/private/var/root/l2tp-hub/active"]);
        ok(&["mkdir", "-p", "/var/run/xl2tpd"]);
        ok(&["rm", "-f", "/var/run/charon.pid"]);
        ok(&["rm", "-rf", "/private/var/root/l2tp-hub/active"]);
        ok(&["cat", "/private/var/root/l2tp-hub/route.state"]);
        ok(&["route", "add", "-host", "vpn.example.com", "192.168.1.1"]);
        ok(&["route", "add", "-net", "10.0.0.0/24", "-interface", "ppp0"]);
        ok(&["route", "change", "default", "-interface", "ppp0"]);
        ok(&["route", "delete", "default"]);
        ok(&["ifconfig", "utun3", "destroy"]);
        ok(&["pkill", "-9", "-f", "charon"]);
        ok(&["pkill", "-TERM", "-f", "pppd"]);
        ok(&["bash", "-c", "echo 'nodetach' > /etc/ppp/options"]);
        ok(&["env", CONF, SWANCTL, "--list-sas", "--raw"]);
        ok(&["env", CONF, SWANCTL, "--load-all", "--noprompt", "-f",
             "/private/var/root/l2tp-hub/active/swanctl.conf"]);
        ok(&["env", CONF, SWANCTL, "--terminate", "--ike", "net1"]);
        ok(&["launchctl", "bootout", "system/com.sentiago.l2tp-hub.xl2tpd"]);
        ok(&["launchctl", "kickstart", "system/com.sentiago.l2tp-hub.charon"]);
        ok(&["launchctl", "bootstrap", "system",
             "/Library/LaunchDaemons/com.sentiago.l2tp-hub.guardian.plist"]);
        ok(&["launchctl", "kill", "SIGTERM", "system/com.sentiago.l2tp-hub.charon"]);
    }

    #[test]
    fn rejects_arbitrary_execution() {
        bad(&[]);
        bad(&["curl", "http://evil"]);
        bad(&["bash", "-c", "rm -rf /"]);
        bad(&["bash", "-c", "echo 'nodetach' > /etc/ppp/options; rm -rf /"]);
        bad(&["env", CONF, "/tmp/evil", "--list-sas", "--raw"]);
        bad(&["env", "STRONGSWAN_CONF=/tmp/x", SWANCTL, "--list-sas", "--raw"]);
        bad(&["env", CONF, SWANCTL, "--load-all", "--noprompt", "-f", "/tmp/evil"]);
        bad(&["guardian_start", "/tmp/evil.sh"]);
        bad(&["guardian_start", "/Library/PrivilegedHelperTools/l2tp-hub-guardian", "; rm -rf /"]);
    }

    #[test]
    fn rejects_paths_outside_prefixes() {
        bad(&["cp", "/tmp/x", "/etc/master.passwd"]);
        bad(&["cp", "/tmp/x", "/private/var/root/l2tp-hub/../etc/hosts"]);
        bad(&["rm", "-rf", "/"]);
        bad(&["rm", "-f", "/Users/someone/notes.txt"]);
        bad(&["chmod", "777", "/etc/passwd"]);
        bad(&["chmod", "x", "/private/var/root/l2tp-hub/active"]);
        bad(&["chown", "root:wheel", "/etc/passwd"]);
        bad(&["chown", "attacker:staff", "/private/var/root/l2tp-hub/active"]);
        bad(&["mkdir", "-p", "/etc/evil"]);
        bad(&["cat", "/etc/master.passwd"]);
    }

    #[test]
    fn rejects_wrong_arguments() {
        bad(&["pkill", "-9", "-f", "Finder"]);
        bad(&["pkill", "-9", "-f"]);
        bad(&["ifconfig", "en0;reboot", "destroy"]);
        bad(&["ifconfig", "en0", "up"]);
        bad(&["route", "add", "-host", "x;rm -rf /", "1.2.3.4"]);
        bad(&["route", "flush"]);
        bad(&["launchctl", "bootstrap", "system", "/tmp/evil.plist"]);
        bad(&["launchctl", "bootout", "system/com.apple.thing"]);
        bad(&["launchctl", "kill", "SIGKILL", "system/com.sentiago.l2tp-hub.helper"]);
        bad(&["env", CONF, SWANCTL, "--terminate", "--ike", "a b; reboot"]);
        bad(&["version", "extra"]);
    }
}
