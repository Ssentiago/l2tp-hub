import { create } from "zustand";
import { api } from "./core/api";
import type {
  ConnectionWithStatus,
  ConnectionPayload,
  Label,
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
  authenticateSudo: (password: string) => Promise<void>;

  appVersion: string;
  loadAppVersion: () => Promise<void>;

  connections: ConnectionWithStatus[];
  connectionsByWorkspace: Record<string, ConnectionWithStatus[]>;
  connectingId: string | null;
  disconnectingId: string | null;
  deletingId: string | null;
  loadConnections: () => Promise<void>;
  invalidateCache: () => void;
  saveConnection: (payload: ConnectionPayload) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  connectVpn: (id: string) => Promise<void>;
  disconnectVpn: (id: string) => Promise<void>;
}

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
  authenticateSudo: async (password) => {
    await api.sudo.authenticate(password);
    const ready = await api.sudo.checkSession();
    set({ sudoReady: ready });
  },

  appVersion: "...",
  loadAppVersion: async () => {
    const { getVersion } = await import("@tauri-apps/api/app");
    const version = await getVersion();
    set({ appVersion: version });
  },

  connections: [],
  connectionsByWorkspace: {},
  connectingId: null,
  disconnectingId: null,
  deletingId: null,
  loadConnections: async () => {
    const { activeWorkspaceId, connectionsByWorkspace } = get();
    const cached = activeWorkspaceId ? connectionsByWorkspace[activeWorkspaceId] : undefined;
    if (cached) {
      set({ connections: cached });
      return;
    }
    const conns = await api.connections.getAll();
    const withStatus = await Promise.all(
      conns.map(async (c) => ({
        ...c,
        status: await api.vpn.getStatus(c.id).catch(() => "unknown" as const),
      })),
    );
    set({
      connections: withStatus,
      connectionsByWorkspace: { ...connectionsByWorkspace, [activeWorkspaceId]: withStatus },
    });
  },
  invalidateCache: () => {
    const { activeWorkspaceId, connectionsByWorkspace } = get();
    const { [activeWorkspaceId]: _, ...rest } = connectionsByWorkspace;
    set({ connectionsByWorkspace: rest });
  },
  saveConnection: async (payload) => {
    await api.connections.save(payload);
    get().invalidateCache();
    await get().loadConnections();
  },
  deleteConnection: async (id) => {
    await api.connections.delete(id);
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
      deletingId: null,
    }));
    get().invalidateCache();
  },
  connectVpn: async (id) => {
    const { sudoReady } = get();
    if (!sudoReady) return;
    set({ connectingId: id });
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, status: "connecting" as const } : c,
      ),
    }));
    try {
      await api.vpn.connect(id);
    } catch (e) {
      set({ connectingId: null });
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, status: "unknown" as const } : c,
        ),
      }));
      return;
    }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const status = await api.vpn.getStatus(id).catch(() => "unknown" as const);
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, status } : c,
        ),
      }));
      if (status === "connected" || status !== "connecting") {
        set({ connectingId: null });
        get().invalidateCache();
        return;
      }
    }
    set({ connectingId: null });
    get().invalidateCache();
  },
  disconnectVpn: async (id) => {
    const prev = get().connections.find((c) => c.id === id);
    set({ disconnectingId: id });
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, status: "disconnected" as const } : c,
      ),
    }));
    try {
      await api.vpn.disconnect(id);
    } catch (e) {
      set({ disconnectingId: null });
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, status: prev?.status ?? "unknown" as const } : c,
        ),
      }));
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
    const status = await api.vpn.getStatus(id).catch(() => "unknown" as const);
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, status } : c,
      ),
    }));
    set({ disconnectingId: null });
    get().invalidateCache();
  },
}));
