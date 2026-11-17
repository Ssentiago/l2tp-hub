use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

/// Счётчики трафика интерфейса туннеля.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize, specta::Type)]
pub struct IfaceCounters {
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub packets_in: u64,
    pub packets_out: u64,
}

impl IfaceCounters {
    /// Пофакторная сумма с насыщением.
    pub fn merged(self, other: Self) -> Self {
        Self {
            bytes_in: self.bytes_in.saturating_add(other.bytes_in),
            bytes_out: self.bytes_out.saturating_add(other.bytes_out),
            packets_in: self.packets_in.saturating_add(other.packets_in),
            packets_out: self.packets_out.saturating_add(other.packets_out),
        }
    }
}

/// Живая статистика активного туннеля.
#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct TunnelStats {
    pub connection_id: String,
    /// Интерфейс туннеля (pppN на macOS), если счётчики доступны
    pub interface: Option<String>,
    pub connected_since: Option<i64>,
    /// Счётчики текущей сессии: накоплено до пересоздания интерфейса
    /// плюс текущие значения
    pub counters: Option<IfaceCounters>,
}

/// Накопленные счётчики сессий, чьи интерфейсы были пересозданы.
/// xl2tpd рестартится при добавлении и удалении LAC, pppN при этом
/// пересоздаются и счётчики интерфейса обнуляются.
static SESSION_OFFSETS: LazyLock<Mutex<HashMap<String, IfaceCounters>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn offsets_lock() -> std::sync::MutexGuard<'static, HashMap<String, IfaceCounters>> {
    SESSION_OFFSETS.lock().unwrap_or_else(|p| p.into_inner())
}

/// Добавить текущие счётчики интерфейса в накопитель сессии.
/// Вызывается перед пересозданием pppN (рестарт xl2tpd).
pub fn accumulate_counters(id: &str, counters: IfaceCounters) {
    let mut map = offsets_lock();
    let entry = map.entry(id.to_string()).or_default();
    *entry = entry.merged(counters);
}

/// Счётчики текущей сессии: накопленные плюс текущие значения интерфейса.
/// None, если нет ни накопленных, ни живых значений.
pub fn session_counters(id: &str, service_name: &str) -> Option<IfaceCounters> {
    let offset = offsets_lock().get(id).copied();
    let live = ppp_counters(service_name);
    match (offset, live) {
        (None, None) => None,
        (offset, live) => Some(offset.unwrap_or_default().merged(live.unwrap_or_default())),
    }
}

/// Суммарные счётчики завершённой сессии; накопитель очищается.
pub fn take_session_counters(id: &str, service_name: &str) -> Option<IfaceCounters> {
    let counters = session_counters(id, service_name);
    offsets_lock().remove(id);
    counters
}

/// Имя интерфейса туннеля подключения (pppN).
#[cfg(target_os = "macos")]
pub fn interface_name(service_name: &str) -> Option<String> {
    crate::l2tp::ppp_unit_marker(service_name).map(|unit| format!("ppp{}", unit))
}

#[cfg(target_os = "windows")]
pub fn interface_name(_service_name: &str) -> Option<String> {
    None
}

/// Счётчики интерфейса pppN подключения. None, если интерфейс
/// недоступен или счётчики не читаются.
#[cfg(target_os = "macos")]
pub fn ppp_counters(service_name: &str) -> Option<IfaceCounters> {
    interface_counters(&interface_name(service_name)?)
}

#[cfg(target_os = "windows")]
pub fn ppp_counters(_service_name: &str) -> Option<IfaceCounters> {
    None
}

/// Счётчики интерфейса по данным `netstat -ibn -I <iface>`.
/// Root-прав не требует.
#[cfg(target_os = "macos")]
fn interface_counters(iface: &str) -> Option<IfaceCounters> {
    let output = std::process::Command::new("netstat")
        .args(["-ibn", "-I", iface])
        .output()
        .ok()?;
    parse_netstat_counters(&String::from_utf8_lossy(&output.stdout))
}

/// Разбор вывода `netstat -ibn -I <iface>`.
/// Колонки: Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll.
/// Address у ppp-интерфейсов пустая, поэтому значения сопоставляются
/// с колонками заголовка от конца строки. Строки разных адресаций повторяют
/// счётчики интерфейса, поэтому по каждой колонке берётся максимум.
fn parse_netstat_counters(output: &str) -> Option<IfaceCounters> {
    let mut lines = output.lines().filter(|l| !l.trim().is_empty());
    let header: Vec<&str> = lines.next()?.split_whitespace().collect();
    let from_end = |name: &str| {
        header
            .iter()
            .position(|c| *c == name)
            .map(|i| header.len() - i)
    };
    let d_ipkts = from_end("Ipkts")?;
    let d_ibytes = from_end("Ibytes")?;
    let d_opkts = from_end("Opkts")?;
    let d_obytes = from_end("Obytes")?;

    let mut best: Option<IfaceCounters> = None;
    for line in lines {
        let fields: Vec<&str> = line.split_whitespace().collect();
        let at = |d: usize| {
            fields
                .len()
                .checked_sub(d)
                .and_then(|i| fields.get(i))
                .and_then(|v| v.parse::<u64>().ok())
        };
        let (Some(bytes_in), Some(bytes_out), Some(packets_in), Some(packets_out)) =
            (at(d_ibytes), at(d_obytes), at(d_ipkts), at(d_opkts))
        else {
            continue;
        };
        best = Some(match best {
            Some(b) => IfaceCounters {
                bytes_in: b.bytes_in.max(bytes_in),
                bytes_out: b.bytes_out.max(bytes_out),
                packets_in: b.packets_in.max(packets_in),
                packets_out: b.packets_out.max(packets_out),
            },
            None => IfaceCounters {
                bytes_in,
                bytes_out,
                packets_in,
                packets_out,
            },
        });
    }
    best
}

#[cfg(test)]
mod tests {
    use super::{accumulate_counters, parse_netstat_counters, take_session_counters, IfaceCounters};

    #[test]
    fn parses_ppp_row_without_address() {
        let out = concat!(
            "Name  Mtu   Network Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes   Coll\n",
            "ppp0  1500  <Link#14>                    12     0       3456       78     0       9012      0\n",
        );
        let c = parse_netstat_counters(out).expect("counters");
        assert_eq!(
            c,
            IfaceCounters {
                bytes_in: 3456,
                bytes_out: 9012,
                packets_in: 12,
                packets_out: 78,
            }
        );
    }

    #[test]
    fn parses_rows_with_address() {
        let out = concat!(
            "Name  Mtu   Network Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes   Coll\n",
            "ppp1  1500  <Link#15>                    10     0       1000       20     0       2000      0\n",
            "ppp1  1500  10.0.2/24        10.0.0.2     10     0       1000       20     0       2000      0\n",
        );
        let c = parse_netstat_counters(out).expect("counters");
        assert_eq!(c.bytes_in, 1000);
        assert_eq!(c.bytes_out, 2000);
        assert_eq!(c.packets_in, 10);
        assert_eq!(c.packets_out, 20);
    }

    #[test]
    fn rows_do_not_lower_max_counters() {
        let out = concat!(
            "Name  Mtu   Network Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes   Coll\n",
            "ppp0  1500  <Link#14>                    12     0       3456       78     0       9012      0\n",
            "ppp0  1500  10.0/24          10.0.0.2      5     0        100        6     0        200      0\n",
        );
        let c = parse_netstat_counters(out).expect("counters");
        assert_eq!(c.bytes_in, 3456);
        assert_eq!(c.bytes_out, 9012);
    }

    #[test]
    fn header_only_returns_none() {
        let out = "Name  Mtu   Network Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes   Coll\n";
        assert!(parse_netstat_counters(out).is_none());
    }

    #[test]
    fn session_counters_take_clears_accumulator() {
        // ppp_unit_marker читает каталог подключения через global_env,
        // для теста инициализируем env с временными путями
        static ENV_ONCE: std::sync::Once = std::sync::Once::new();
        ENV_ONCE.call_once(|| {
            let dir = std::env::temp_dir().join("l2tp-hub-stats-test");
            crate::env::init_env(crate::env::AppEnv::with_paths(
                dir.clone(),
                dir.join("test.db"),
                dir,
            ));
        });
        let id = "test-take-clears";
        accumulate_counters(
            id,
            IfaceCounters {
                bytes_in: 100,
                bytes_out: 200,
                packets_in: 1,
                packets_out: 2,
            },
        );
        let taken = take_session_counters(id, "no-such-service").expect("offset only");
        assert_eq!(taken.bytes_in, 100);
        assert_eq!(taken.bytes_out, 200);
        // Повторный вызов возвращает пустые счётчики: накопитель очищен,
        // интерфейс недоступен
        assert!(take_session_counters(id, "no-such-service").is_none());
    }
}
