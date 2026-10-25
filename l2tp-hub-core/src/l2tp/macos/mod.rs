pub mod error;
pub mod paths;
pub mod routes;
pub mod guardian;
pub mod daemon;
pub mod config;
pub mod connect;
pub mod helpers;
pub mod cleanup;
pub mod manager;

// Re-exports для обратной совместимости — внешний код использует `crate::l2tp::*`
pub use error::{ConnData, ConnectError, classify_connect_failure};
pub use paths::{config_dir, active_dir, sanitize_name};
pub use routes::{capture_physical_route, save_route_state, load_route_state, clear_route_state};
pub use guardian::{install_guardian_daemon, deactivate_guardian, stop_heartbeat_thread, get_default_gateway};
pub use connect::{
    create_vpn_service, delete_vpn_service,
    connect_vpn, disconnect_vpn, disconnect_single,
    switch_tunnel_mode, get_vpn_status, list_vpn_services, configs_exist,
};
pub use helpers::{is_process_running_global, check_ipsec_sa_alive};
pub use cleanup::cleanup_all_vpn_state;
