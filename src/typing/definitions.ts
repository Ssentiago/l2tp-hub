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
  server: string;
  username: string;
  keychain_key: string;
  shared_secret_key: string;
  priority: number;
  send_all_traffic: boolean;
  service_hash: string | null;
  labels: Record<LabelID, LabelValue>;
}

export type VpnStatus = "connected" | "connecting" | "disconnected" | "unknown";

export interface ConnectionWithStatus extends Connection {
  status: VpnStatus;
}

export interface ConnectionPayload {
  id?: string;
  server: string;
  username: string;
  password: string;
  shared_secret: string;
  labels: Record<string, string>;
}

export interface FilterState {
  search: string;
  status: VpnStatus | "all";
  labels: Record<string, string>;
}

export type SortField = "name" | "priority" | "status";
export type SortDir = "asc" | "desc";
