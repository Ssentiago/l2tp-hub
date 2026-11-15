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
pub use error::{
    ConnData, ConnectError, ConnectErrorCode, ConnectSignal, ConnectStage, IkeSaState, LogSource,
    classify_connect_failure, log_signals, pppd_outcome_signals,
};
pub use paths::{config_dir, active_dir, sanitize_name};
pub use routes::{capture_physical_route, save_route_state, load_route_state, clear_route_state};
pub use guardian::{install_guardian_daemon, deactivate_guardian, stop_heartbeat_thread, get_default_gateway};
pub use connect::{
    create_vpn_service, delete_vpn_service,
    connect_vpn, disconnect_vpn, disconnect_single,
    switch_tunnel_mode, list_vpn_services, configs_exist,
};
pub use helpers::{is_process_running_global, check_ipsec_sa_alive, ppp_unit_marker, is_ppp_unit_running, established_ike_sas, ike_sa_state};
pub use cleanup::cleanup_all_vpn_state;
