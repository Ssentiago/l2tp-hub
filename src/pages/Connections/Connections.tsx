import {useState, useEffect, useCallback, useRef} from "react";
import {Box, CircularProgress} from "@mui/material";
import {api} from "../../core/api";
import {ConnectionList} from "./ConnectionList";
import {SudoModal} from "../../components/SudoModal";
import type {
    Connection, ConnectionWithStatus, FilterState, SortDir, SortField, Label,
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

export function Connections({labels, onEdit}: Props) {
    const [connections, setConnections] = useState<ConnectionWithStatus[]>([]);
    const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [loading, setLoading] = useState(true);
    const [sudoReady, setSudoReady] = useState(false);
    const [showSudoModal, setShowSudoModal] = useState(false);

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

        const current = connectionsRef.current.find(c => c.id === id);
        if (current?.status === "connecting" || current?.status === "connected") return;

        setConnections((prev) =>
            prev.map((c) => (c.id === id ? {...c, status: "connecting"} : c)),
        );
        try {
            console.log("[handleConnect] calling api.vpn.connect");
            await api.vpn.connect(id);
            console.log("[handleConnect] api.vpn.connect resolved OK");
        } catch (e) {
            console.error("[handleConnect] api.vpn.connect ERROR:", e);
        } finally {
            console.log("[handleConnect] finally: calling getStatus");
            const status = await api.vpn.getStatus(id).catch(() => "unknown" as const);
            console.log("[handleConnect] finally: status=", status);
            setConnections((prev) =>
                prev.map((c) => (c.id === id ? {...c, status} : c)),
            );
        }
    };

    const handleDisconnect = async (id: string) => {
        setConnections((prev) =>
            prev.map((c) => (c.id === id ? {...c, status: "disconnected"} : c)),
        );
        try {
            await api.vpn.disconnect(id);
        } finally {
            await new Promise((r) => setTimeout(r, 2000));
            const status = await api.vpn.getStatus(id).catch(() => "unknown" as const);
            setConnections((prev) =>
                prev.map((c) => (c.id === id ? {...c, status} : c)),
            );
        }
    };

    const handleDelete = async (id: string) => {
        await api.connections.delete(id);
        setConnections((prev) => prev.filter((c) => c.id !== id));
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
                <Box sx={{display: "flex", justifyContent: "center", mt: 8}}>
                    <CircularProgress/>
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
                />
            )}
        </>
    );
}