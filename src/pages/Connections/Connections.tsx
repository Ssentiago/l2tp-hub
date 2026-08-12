import { useState, useEffect, useCallback, useRef } from "react";
import { Box, CircularProgress } from "@mui/material";
import toast from "react-hot-toast";
import { api } from "../../core/api";
import { ConnectionList } from "./components/ConnectionList";
import { SudoModal } from "./components/SudoModal";
import type {
  Connection,
  ConnectionWithStatus,
  FilterState,
  SortDir,
  SortField,
  Label,
} from "../../typing/definitions";

const DEFAULT_FILTER: FilterState = {
  search: "",
  status: "all",
  labels: {},
};

interface Props {
  labels: Label[];
  onEdit: (conn: Connection) => void;
}

export function Connections({ labels, onEdit }: Props) {
  const [connections, setConnections] = useState<ConnectionWithStatus[]>([]);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [sudoReady, setSudoReady] = useState(false);
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const connectionsRef = useRef<ConnectionWithStatus[]>([]);
  connectionsRef.current = connections;

  const loadConnections = useCallback(async () => {
    const conns = await api.connections.getAll();
    const withStatus = await Promise.all(
      conns.map(async (c) => ({
        ...c,
        status: await api.vpn.getStatus(c.id).catch(() => "unknown" as const),
      })),
    );
    setConnections(withStatus);
    setLoading(false);
  }, []);

  const pollStatuses = useCallback(async () => {
    const current = connectionsRef.current;
    if (current.length === 0) return;
    const updated = await Promise.all(
      current.map(async (c) => {
        return {
          ...c,
          status: await api.vpn.getStatus(c.id).catch(() => "unknown" as const),
        };
      }),
    );
    setConnections(updated);
  }, []);

  useEffect(() => {
    loadConnections();
    api.sudo.checkSession().then((ready) => {
      setSudoReady(ready);
      if (!ready) setShowSudoModal(true);
    });
  }, [loadConnections]);

  useEffect(() => {
    const interval = setInterval(pollStatuses, 5000);
    return () => clearInterval(interval);
  }, [pollStatuses]);

  const handleConnect = async (id: string) => {
    console.log("[handleConnect] called, id=", id, "sudoReady=", sudoReady);
    if (!sudoReady) {
      setShowSudoModal(true);
      return;
    }

    const current = connectionsRef.current.find((c) => c.id === id);
    if (current?.status === "connecting" || current?.status === "connected")
      return;

    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "connecting" } : c)),
    );
    setConnectingId(id);

    try {
      console.log("[handleConnect] calling api.vpn.connect");
      await api.vpn.connect(id);
      console.log("[handleConnect] api.vpn.connect resolved OK");
    } catch (e) {
      console.error("[handleConnect] api.vpn.connect ERROR:", e);
      toast.error(`Ошибка подключения: ${String(e)}`);
      setConnectingId(null);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "unknown" } : c)),
      );
      return;
    }

    // Poll until connected or timeout — keep loading state active
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const status = await api.vpn
        .getStatus(id)
        .catch(() => "unknown" as const);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
      if (status === "connected" || status !== "connecting") {
        setConnectingId(null);
        return;
      }
    }
    // Timeout after 10s — still clear loading state
    setConnectingId(null);
  };

  const handleDisconnect = async (id: string) => {
    const prevStatus = connectionsRef.current.find((c) => c.id === id)?.status;
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "disconnected" } : c)),
    );
    setDisconnectingId(id);

    try {
      await api.vpn.disconnect(id);
    } catch (e) {
      console.error("[handleDisconnect] ERROR:", e);
      toast.error(`Ошибка отключения: ${String(e)}`);
      setDisconnectingId(null);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: prevStatus ?? "unknown" } : c)),
      );
      return;
    }

    // Wait 2s then poll for final status
    await new Promise((r) => setTimeout(r, 2000));
    const status = await api.vpn
      .getStatus(id)
      .catch(() => "unknown" as const);
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
    setDisconnectingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.connections.delete(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSudoAuth = async (password: string) => {
    await api.sudo.authenticate(password);
    if (await api.sudo.checkSession()) {
      setSudoReady(true);
      setShowSudoModal(false);
    }
  };

  const filtered = connections
    .filter((c) => {
      if (filter.search) {
        const labelValues = Object.values(c.labels).join(" ");
        if (
          !`${c.name} ${c.server} ${labelValues}`
            .toLowerCase()
            .includes(filter.search.toLowerCase())
        )
          return false;
      }
      if (filter.status !== "all" && c.status !== filter.status) return false;
      for (const [id, value] of Object.entries(filter.labels)) {
        if (value && c.labels[id] !== value) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "status") return a.status.localeCompare(b.status) * dir;
      return (
        (a.labels["company"] ?? a.name).localeCompare(
          b.labels["company"] ?? b.name,
        ) * dir
      );
    });

  return (
    <>
      {showSudoModal && (
        <SudoModal
          onAuth={handleSudoAuth}
          onClose={() => setShowSudoModal(false)}
        />
      )}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ConnectionList
          connections={filtered}
          labels={labels}
          loading={loading}
          filter={filter}
          onFilterChange={setFilter}
          sortField={sortField}
          sortDir={sortDir}
          onSort={(field) => {
            if (field === sortField)
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            else {
              setSortField(field);
              setSortDir("asc");
            }
          }}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onEdit={onEdit}
          onDelete={handleDelete}
          connectingId={connectingId}
          disconnectingId={disconnectingId}
          deletingId={deletingId}
        />
      )}
    </>
  );
}
