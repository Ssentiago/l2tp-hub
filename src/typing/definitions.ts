export interface Label {
  id: string;
  name: string;
  built_in: boolean;
}

export type LabelID = string;
export type LabelValue = string;

export interface Connection {
  id: string;
  name: string;
  display_name: string;
  server: string;
  username: string;
  keychain_key: string;
  shared_secret_key: string;
  labels: Record<LabelID, LabelValue>;
  connect_count: number;
  connected_since: number | null;
  last_connected_at: number | null;
  last_disconnected_at: number | null;
  tunnel_mode: "full" | "split";
  split_routes: string[];
  auto_discovered_routes: string[];
}

export type VpnStatus = "connected" | "connecting" | "reconnecting" | "disconnected" | "unknown";

export interface ConnectionWithStatus extends Connection {
  status: VpnStatus;
  error?: string;
}

export interface ConnectionPayload {
  id?: string;
  display_name: string;
  server: string;
  username: string;
  password: string;
  shared_secret: string;
  labels: Record<string, string>;
  tunnel_mode?: "full" | "split";
  split_routes?: string[];
}

export interface FilterState {
  search: string;
  status: VpnStatus | "all";
  labels: Record<string, string>;
}

export type SortField = "name" | "status";
export type SortDir = "asc" | "desc";

export interface WorkspaceInfo {
  id: string;
  name: string;
  group_by: string[];
}
