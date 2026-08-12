import { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { ConnectionList } from "./components/ConnectionList";
import { SudoModal } from "./components/SudoModal";
import { useStore } from "../../store";
import type {
  Connection,
  FilterState,
  SortDir,
  SortField,
  Label,
  VpnStatus,
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
    checkSudo,
  } = useStore();

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [groupBy, setGroupBy] = useState<string>("company");

  useEffect(() => {
    loadConnections().then(() => setLoading(false));
    checkSudo();
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<{ id: string; status: VpnStatus }>(
      "vpn:status-changed",
      (event) => {
        const { id, status } = event.payload;
        useStore.setState((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, status } : c,
          ),
        }));
      },
    );
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  const handleConnect = async (id: string) => {
    if (!sudoReady) {
      setShowSudoModal(true);
      return;
    }
    const c = connections.find((c) => c.id === id);
    if (c?.status === "connecting" || c?.status === "connected") return;
    await connectVpn(id);
  };

  const handleDisconnect = async (id: string) => {
    await disconnectVpn(id);
  };

  const handleDelete = async (id: string) => {
    await deleteConnection(id);
  };

  const handleSudoAuth = async (password: string) => {
    await useStore.getState().authenticateSudo(password);
    if (useStore.getState().sudoReady) setShowSudoModal(false);
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

  const anyActive = connections.some(
    (c) => c.status === "connected" || c.status === "connecting",
  );

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
          onDisconnect={handleDisconnect}
          onEdit={onEdit}
          onDelete={handleDelete}
          connectingId={connectingId}
          disconnectingId={disconnectingId}
          deletingId={deletingId}
          anyActive={anyActive}
        />
      )}
    </>
  );
}
