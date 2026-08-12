import { invoke } from "@tauri-apps/api/core";
import {
  Connection,
  ConnectionPayload,
  Label,
  VpnStatus,
  WorkspaceInfo,
} from "../typing/definitions.ts";

export interface UpdateInfo {
  latest_version: string;
  download_url: string;
  asset_name: string;
}

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
    check: (id: string) =>
      invoke<{ reachable: boolean }>("check_connection", { id }),
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
  update: {
    check: (currentVersion: string) =>
      invoke<UpdateInfo | null>("check_update", { currentVersion }),
    apply: (downloadUrl: string, assetName: string) =>
      invoke<void>("apply_update", { downloadUrl, assetName }),
  },
  workspaces: {
    list: () => invoke<WorkspaceInfo[]>("get_workspaces"),
    getActiveId: () => invoke<string>("get_active_workspace_id"),
    create: (name: string) =>
      invoke<WorkspaceInfo>("create_workspace", { name }),
    rename: (id: string, name: string) =>
      invoke<void>("rename_workspace", { id, name }),
    delete: (id: string) => invoke<void>("delete_workspace", { id }),
    switch: (id: string) => invoke<void>("switch_workspace", { id }),
  },
};
