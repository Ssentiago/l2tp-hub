use crate::l2tp::VpnStatus;
use crate::{l2tp, log, store};
use rand::Rng;
use std::io;
use std::net::UdpSocket;
use std::time::Duration;

const IKE_SA_INIT_PAYLOAD: &[u8] = include_bytes!("../../../ike-sa-init-payload.bin");

#[derive(serde::Serialize)]
pub struct HealthResult {
    pub reachable: bool,
}

#[tauri::command]
pub async fn check_connection(app_handle: tauri::AppHandle, id: String) -> Result<HealthResult, String> {
    log!("[health] check_connection called for id={}", id);

    let store = store::load(app_handle.config());
    let conn = store
        .workspaces
        .iter()
        .flat_map(|ws| ws.connections.iter())
        .find(|c| c.id == id)
        .ok_or("Подключение не найдено")?
        .clone();

    // Check if any VPN is active
    for ws in &store.workspaces {
        for c in &ws.connections {
            let status = l2tp::get_vpn_status(&c.name);
            if status == VpnStatus::Connected || status == VpnStatus::Connecting {
                return Err(
                    "Проверка недоступна во время активного VPN-подключения".into(),
                );
            }
        }
    }

    let server = conn.server.clone();
    let app_clone = app_handle.clone();

    tokio::task::spawn_blocking(move || {
        let addr = format!("{}:500", server);

        let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("Ошибка сокета: {}", e))?;
        socket
            .set_read_timeout(Some(Duration::from_secs(5)))
            .map_err(|e| format!("Ошибка сокета: {}", e))?;
        socket
            .connect(&addr)
            .map_err(|e| format!("Ошибка подключения: {}", e))?;

        // Build packet: copy embedded payload, replace first 8 bytes with random cookie
        let mut packet = IKE_SA_INIT_PAYLOAD.to_vec();
        let mut rng = rand::thread_rng();
        rng.fill(&mut packet[0..8]);

        log!(
            "[health] sending {} bytes to {}",
            packet.len(),
            addr
        );

        socket
            .send(&packet)
            .map_err(|e| format!("Ошибка отправки: {}", e))?;

        // Wait for ANY ISAKMP response — even a notify message proves the server is alive
        let mut buf = [0u8; 1500];
        match socket.recv(&mut buf) {
            Ok(n) => {
                log!("[health] received {} bytes from {}", n, addr);
                Ok(HealthResult { reachable: true })
            }
            Err(ref e) if e.kind() == io::ErrorKind::WouldBlock
                || e.kind() == io::ErrorKind::TimedOut =>
            {
                log!("[health] timeout from {}", addr);
                Ok(HealthResult { reachable: false })
            }
            Err(e) => Err(format!("Ошибка получения: {}", e)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
