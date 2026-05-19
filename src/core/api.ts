import { invoke } from "@tauri-apps/api/core";
import {
  Connection,
  ConnectionPayload,
  Label,
  VpnStatus,
} from "../typing/definitions.ts";

export const api = {
  connections: {
    getAll: () => invoke<Connection[]>("get_connections"),
    save: (input: ConnectionPayload) =>
      invoke<Connection>("save_connection", { input }),
    delete: (id: string) => invoke<void>("delete_connection", { id }),
  },
  vpn: {
    connect: (id: string) => invoke<void>("connect_vpn", { id }),
    disconnect: (id: string) => invoke<void>("disconnect_vpn", { id }),
    getStatus: (id: string) => invoke<VpnStatus>("get_vpn_status", { id }),
  },
  sudo: {
    authenticate: (password: string) =>
      invoke<void>("authenticate_sudo", { password }),
    checkSession: () => invoke<boolean>("check_sudo_session"),
  },
  labels: {
    getAll: () => invoke<Label[]>("get_labels"),
    save: (id: string, name: string) =>
      invoke<Label>("save_label", { id, name }),
    delete: (id: string) => invoke<void>("delete_label", { id }),
  },
  app: {
    openUrl: (url: string) => invoke<void>("open_url", { url }),
  },
  config: {
    import: (password: string) => invoke<boolean>("import", { password }),
    export: (password: string) => invoke<boolean>("export", { password }),
    reset: () => invoke<void>("reset"),
  },
};
