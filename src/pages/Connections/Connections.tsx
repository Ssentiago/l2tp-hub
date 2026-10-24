import { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ConnectionList } from "./components/ConnectionList";
import { SwitchConfirmDialog } from "./components/ActionButtons";
import { useStore } from "../../store";
import { api } from "../../core/api";
import { getDisplayTitle } from "../../core/display";
import type {
  Connection,
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
  const {
    connections,
    connectingId,
    disconnectingId,
    deletingId,
    loadConnections,
    connectVpn,
    disconnectVpn,
    deleteConnection,
    sudoReady,
  } = useStore();

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<string>("company");
  const [switchTarget, setSwitchTarget] = useState<string | null>(null);

  useEffect(() => {
    loadConnections().then(() => setLoading(false));
  }, []);

  // Event listener для vpn-status-changed инициализируется в App.tsx через initVpnEventListener()

  const handleConnect = async (id: string) => {
    if (!sudoReady) return;
    const c = connections.find((c) => c.id === id);
    if (c?.status === "connecting" || c?.status === "connected") return;
    await connectVpn(id);
  };

  const handleConnectWithMode = async (id: string, mode: "full" | "split") => {
    if (!sudoReady) return;
    const c = connections.find((c) => c.id === id);
    if (c?.status === "connecting" || c?.status === "connected") return;
    // Сохраняем выбранный режим в профиль перед подключением
    if (c && c.tunnel_mode !== mode) {
      await api.connections.save({
        id: c.id,
        display_name: c.display_name,
        server: c.server,
        username: c.username,
        password: "",
        shared_secret: "",
        labels: c.labels,
        tunnel_mode: mode,
        split_routes: c.split_routes,
      });
      await loadConnections();
    }
    await connectVpn(id);
  };

  const handleModeSwitch = async (id: string, mode: "full" | "split") => {
    const c = connections.find((c) => c.id === id);
    if (!c || c.status !== "connected" || c.tunnel_mode === mode) return;
    try {
      await api.vpn.switchTunnelMode(id, mode);
      await loadConnections();
    } catch (e) {
      console.error("switch_tunnel_mode failed:", e);
    }
  };

  const handleDisconnect = async (id: string) => {
    await disconnectVpn(id);
  };

  const handleDelete = async (id: string) => {
    await deleteConnection(id);
  };

  const handleSwitch = (id: string) => {
    setSwitchTarget(id);
  };

  const handleSwitchConfirm = async () => {
    if (!switchTarget) return;
    const targetId = switchTarget;
    setSwitchTarget(null);
    // Disconnect current, then connect target
    const activeConn = connections.find((c) => c.status === "connected");
    if (activeConn) {
      await disconnectVpn(activeConn.id);
    }
    await connectVpn(targetId);
  };

  const activeConn = connections.find((c) => c.status === "connected") ?? null;
  const switchTargetConn = switchTarget ? connections.find((c) => c.id === switchTarget) : null;

  const filtered = connections
    .filter((c) => {
      if (filter.search) {
        const labelValues = Object.values(c.labels).join(" ");
        if (
          !`${c.display_name} ${c.server} ${labelValues}`
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
        (a.labels["company"] ?? a.display_name).localeCompare(
          b.labels["company"] ?? b.display_name,
        ) * dir
      );
    });

  return (
    <>
      <SwitchConfirmDialog
        open={switchTarget !== null}
        targetName={switchTargetConn ? getDisplayTitle(switchTargetConn) : ""}
        currentName={activeConn ? getDisplayTitle(activeConn) : ""}
        onConfirm={handleSwitchConfirm}
        onCancel={() => setSwitchTarget(null)}
      />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ConnectionList
          connections={filtered}
          allConnections={connections}
          labels={labels}
          loading={loading}
          filter={filter}
          onFilterChange={setFilter}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
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
          onConnectWithMode={handleConnectWithMode}
          onDisconnect={handleDisconnect}
          onSwitch={handleSwitch}
          onModeSwitch={handleModeSwitch}
          onEdit={onEdit}
          onDelete={handleDelete}
          connectingId={connectingId}
          disconnectingId={disconnectingId}
          deletingId={deletingId}
          onModeChanged={() => loadConnections()}
        />
      )}
    </>
  );
}
