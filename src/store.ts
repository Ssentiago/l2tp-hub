import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api } from "./core/api";
import type {
  ConnectionWithStatus,
  ConnectionPayload,
  Label,
  VpnStatus,
  WorkspaceInfo,
} from "./typing/definitions";

interface Store {
  labels: Label[];
  loadLabels: () => Promise<void>;
  saveLabel: (id: string, name: string) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;

  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string;
  workspaceVersion: number;
  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  sudoReady: boolean;
  checkSudo: () => Promise<void>;
  authenticateSudo: () => Promise<void>;

  keychainReady: boolean;
  checkKeychain: () => Promise<void>;
  requestKeychainAccess: () => Promise<void>;

  appVersion: string;
  loadAppVersion: () => Promise<void>;

  connections: ConnectionWithStatus[];
  connectingId: string | null;
  disconnectingId: string | null;
  deletingId: string | null;
  loadConnections: () => Promise<void>;
  saveConnection: (payload: ConnectionPayload) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  connectVpn: (id: string) => Promise<void>;
  disconnectVpn: (id: string) => Promise<void>;

  /** Инициализирует event listener для vpn-status-changed. Вызвать один раз при старте. */
  initVpnEventListener: () => void;
}

// Глобальный ref для unlisten, чтобы не дублировать listener
let vpnEventUnlisten: (() => void) | null = null;

export const useStore = create<Store>((set, get) => ({
  labels: [],
  loadLabels: async () => {
    const labels = await api.labels.getAll();
    set({ labels });
  },
  saveLabel: async (id, name) => {
    await api.labels.save(id, name);
    await get().loadLabels();
  },
  deleteLabel: async (id) => {
    await api.labels.delete(id);
    await get().loadLabels();
  },

  workspaces: [],
  activeWorkspaceId: "",
  workspaceVersion: 0,
  loadWorkspaces: async () => {
    const workspaces = await api.workspaces.list();
    const activeId = await api.workspaces.getActiveId();
    set({ workspaces, activeWorkspaceId: activeId });
  },
  switchWorkspace: async (id) => {
    await api.workspaces.switch(id);
    set({ activeWorkspaceId: id, workspaceVersion: get().workspaceVersion + 1 });
    await get().loadConnections();
  },
  createWorkspace: async (name) => {
    const ws = await api.workspaces.create(name);
    await api.workspaces.switch(ws.id);
    set({ activeWorkspaceId: ws.id, workspaceVersion: get().workspaceVersion + 1 });
    await get().loadWorkspaces();
    await get().loadConnections();
  },
  renameWorkspace: async (id, name) => {
    await api.workspaces.rename(id, name);
    await get().loadWorkspaces();
  },
  deleteWorkspace: async (id) => {
    await api.workspaces.delete(id);
    await get().loadWorkspaces();
    const state = get();
    if (state.activeWorkspaceId === id) {
      const activeId = await api.workspaces.getActiveId();
      set({ activeWorkspaceId: activeId, workspaceVersion: state.workspaceVersion + 1 });
      await get().loadConnections();
    }
  },

  sudoReady: false,
  checkSudo: async () => {
    const ready = await api.sudo.checkSession();
    set({ sudoReady: ready });
  },
  authenticateSudo: async () => {
    await api.sudo.authenticate();
    const ready = await api.sudo.checkSession();
    set({ sudoReady: ready });
  },

  keychainReady: false,
  checkKeychain: async () => {
    try {
      const ok = await api.system.checkKeychainAccess();
      set({ keychainReady: ok });
    } catch {
      set({ keychainReady: false });
    }
  },
  requestKeychainAccess: async () => {
    try {
      const ok = await api.system.checkKeychainAccess();
      set({ keychainReady: ok });
    } catch {
      set({ keychainReady: false });
    }
  },

  appVersion: "...",
  loadAppVersion: async () => {
    const { getVersion } = await import("@tauri-apps/api/app");
    const version = await getVersion();
    set({ appVersion: version });
  },

  connections: [],
  connectingId: null,
  disconnectingId: null,
  deletingId: null,
  loadConnections: async () => {
    const conns = await api.connections.getAll();
    const statuses = await api.vpn.getAllStatuses().catch(() => ({} as Record<string, VpnStatus>));
    const withStatus = conns.map((c) => ({
      ...c,
      status: (statuses[c.id] ?? "unknown") as VpnStatus,
    }));
    set({ connections: withStatus });
  },
  saveConnection: async (payload) => {
    await api.connections.save(payload);
    await get().loadConnections();
  },
  deleteConnection: async (id) => {
    await api.connections.delete(id);
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
      deletingId: null,
    }));
  },
  connectVpn: async (id) => {
    // Re-validate sudo — cache may have expired since last check
    await get().checkSudo();
    const { sudoReady, connectingId, connections } = get();
    if (!sudoReady || connectingId) return;
    // Блокируем если другое соединение уже активно
    if (connections.some((c) => c.id !== id && (c.status === "connected" || c.status === "connecting"))) return;
    set({ connectingId: id });
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, status: "connecting" as const } : c,
      ),
    }));
    try {
      // connect блокирует до полного установления VPN (~15 сек)
      // Статус обновится через vpn-status-changed event от бэкенда
      await api.vpn.connect(id);
    } catch (e) {
      // Ошибка — event "disconnected" уже пришёл от бэкенда, но на всякий случай:
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, status: "disconnected" as const } : c,
        ),
      }));
      set({ connectingId: null });
    }
    // connectingId сбрасывается event listener'ом при получении "connected"
    // НЕ вызываем loadConnections() — event listener обновит статус
  },
  disconnectVpn: async (id) => {
    const { disconnectingId } = get();
    if (disconnectingId) return;
    set({ disconnectingId: id });
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, status: "disconnected" as const } : c,
      ),
    }));
    try {
      await api.vpn.disconnect(id);
    } catch (e) {
      // Ошибка — статус уже выставлен в "disconnected" оптимистично
    }
    // disconnectingId сбрасывается event listener'ом при получении "disconnected"
    // НЕ вызываем loadConnections() — event listener обновит статус
  },

  initVpnEventListener: () => {
    if (vpnEventUnlisten) return; // уже инициализирован
    listen<{ id: string; status: VpnStatus; connected_since?: number }>("vpn-status-changed", (event) => {
      const { id, status, connected_since } = event.payload;
      console.log("[store] vpn-status-changed event:", id, status, connected_since);
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, status, ...(connected_since !== undefined ? { connected_since } : {}) } : c,
        ),
      }));
      // Сбрасываем pending state при получении финального статуса
      if (status === "connected") {
        set({ connectingId: null });
      }
      if (status === "disconnected") {
        set({ disconnectingId: null });
      }
    }).then((unlisten) => {
      vpnEventUnlisten = unlisten;
    });
  },
}));
