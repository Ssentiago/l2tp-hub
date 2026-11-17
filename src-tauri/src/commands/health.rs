use l2tp_hub_core::error::{AppError, AppErrorCode};
use crate::l2tp::VpnStatus;
use crate::{log, store};
use rand::Rng;
use std::io;
use std::net::UdpSocket;
use std::process::Command;
use std::time::Duration;
use tauri::Manager;

const IKE_SA_INIT_PAYLOAD: &[u8] = include_bytes!("../../../ike-sa-init-payload.bin");

#[derive(serde::Serialize, specta::Type)]
pub struct HealthResult {
    pub ping: bool,
    pub ipsec: bool,
}

fn icmp_ping(host: &str) -> bool {
    let output = Command::new("ping")
        .arg("-c")
        .arg("1")
        .arg("-W")
        .arg("2000")
        .arg(host)
        .output();

    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

fn ike_probe(server: &str) -> Result<bool, AppError> {
    let addr = format!("{}:500", server);

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| AppError::detail(AppErrorCode::SocketError, e.to_string()))?;
    socket
        .set_read_timeout(Some(Duration::from_secs(4)))
        .map_err(|e| AppError::detail(AppErrorCode::SocketError, e.to_string()))?;
    socket
        .connect(&addr)
        .map_err(|e| AppError::detail(AppErrorCode::ConnectionError, e.to_string()))?;

    let mut packet = IKE_SA_INIT_PAYLOAD.to_vec();
    let mut rng = rand::thread_rng();
    rng.fill(&mut packet[0..8]);

    log!("[health] IKE probe: sending {} bytes to {}", packet.len(), addr);

    socket
        .send(&packet)
        .map_err(|e| AppError::detail(AppErrorCode::SendError, e.to_string()))?;

    let mut buf = [0u8; 1500];
    match socket.recv(&mut buf) {
        Ok(n) => {
            log!("[health] IKE response: {} bytes from {}", n, addr);
            Ok(true)
        }
        Err(ref e) if e.kind() == io::ErrorKind::WouldBlock
            || e.kind() == io::ErrorKind::TimedOut =>
        {
            log!("[health] IKE timeout from {}", addr);
            Ok(false)
        }
        Err(e) => Err(AppError::detail(AppErrorCode::ReceiveError, e.to_string())),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn check_connection(app_handle: tauri::AppHandle, id: String) -> Result<HealthResult, AppError> {
    log!("[health] check_connection called for id={}", id);

    let _app_clone = app_handle.clone();
    let store = store::load(&crate::DB_POOL.get().expect("pool")).await;
    let conn = store
        .workspaces
        .iter()
        .flat_map(|ws| ws.connections.iter())
        .find(|c| c.id == id)
        .ok_or(AppError::new(AppErrorCode::ConnectionNotFound))?
        .clone();

    // Check if any VPN is active
    let manager = app_handle.state::<crate::l2tp::manager::L2tpManager>();
    for ws in &store.workspaces {
        for c in &ws.connections {
            let status = manager.status(&c.id).await;
            if status == VpnStatus::Connected || status == VpnStatus::Connecting {
                return Err(
                    AppError::new(AppErrorCode::CheckUnavailableDuringVpn),
                );
            }
        }
    }

    let server = conn.server.clone();

    // Blocking network operations in spawn_blocking
    let result = tokio::task::spawn_blocking(move || {
        let ping = icmp_ping(&server);
        log!("[health] ICMP ping {}: {}", server, if ping { "OK" } else { "FAIL" });

        let ipsec = match ike_probe(&server) {
            Ok(result) => {
                log!("[health] IKE probe {}: {}", server, if result { "OK" } else { "no response" });
                result
            }
            Err(e) => {
                log!("[health] IKE probe error: {}", e);
                false
            }
        };

        Ok(HealthResult { ping, ipsec })
    })
    .await
    .map_err(|e| e.to_string())?;

    result
}
