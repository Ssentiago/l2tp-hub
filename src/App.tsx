import { useState, useEffect, useCallback, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Add, ArrowBack, Settings, Info } from "@mui/icons-material";
import { api } from "./api";
import { ConnectionList } from "./components/ConnectionList";
import { ConnectionForm } from "./components/ConnectionForm";
import { SudoModal } from "./components/SudoModal";
import type {
  Connection,
  ConnectionWithStatus,
  FilterState,
  SortDir,
  SortField,
  Label,
} from "./types";
import { SettingsPage } from "./SettingsPage";
import { About } from "./About";
import { getVersion } from "@tauri-apps/api/app";

type View = "list" | "form" | "settings" | "about";

const DEFAULT_FILTER: FilterState = {
  search: "",
  status: "all",
  priority: null,
  labels: {},
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#90caf9" },
    background: { default: "#121212", paper: "#1e1e1e" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": { userSelect: "none" },
        "p, span, h1, h2, h3, h4, h5, h6, label, li, td, th, div": {
          cursor: "default",
        },
      },
    },
  },
});

export default function App() {
  const [connections, setConnections] = useState<ConnectionWithStatus[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [view, setView] = useState<View>("list");
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  const [sudoReady, setSudoReady] = useState(false);
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState("...");

  // Держим актуальный список connections для poll-а без лишних замыканий
  const connectionsRef = useRef<ConnectionWithStatus[]>([]);
  connectionsRef.current = connections;

  const loadConnections = useCallback(async () => {
    const conns = await api.getConnections();
    const withStatus = await Promise.all(
      conns.map(async (c) => ({
        ...c,
        status: await api.getVpnStatus(c.id).catch(() => "unknown" as const),
      })),
    );
    setConnections(withStatus);
    setLoading(false);
  }, []);

  const loadLabels = useCallback(async () => {
    setLabels(await api.getLabels());
  }, []);

  // Fix 2: поллим только статусы, не перезагружаем весь список
  const pollStatuses = useCallback(async () => {
    const current = connectionsRef.current;
    if (current.length === 0) return;
    const updated = await Promise.all(
      current.map(async (c) => ({
        ...c,
        status: await api.getVpnStatus(c.id).catch(() => "unknown" as const),
      })),
    );
    setConnections(updated);
  }, []);

  useEffect(() => {
    getVersion().then(setAppVersion);
    loadConnections();
    loadLabels();
    api.checkSudoSession().then((ready) => {
      setSudoReady(ready);
      if (!ready) setShowSudoModal(true);
    });
  }, [loadConnections, loadLabels]);

  useEffect(() => {
    const interval = setInterval(pollStatuses, 5000);
    return () => clearInterval(interval);
  }, [pollStatuses]);

  // Fix 1: оптимистичный статус — сразу меняем локально, не ждём poll
  const handleConnect = async (id: string) => {
    if (!sudoReady) {
      setShowSudoModal(true);
      return;
    }
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "connecting" } : c)),
    );
    try {
      await api.connectVpn(id);
    } finally {
      // после завершения команды тянем актуальный статус
      const status = await api.getVpnStatus(id).catch(() => "unknown" as const);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
    }
  };

  const handleDisconnect = async (id: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "disconnected" } : c)),
    );
    try {
      await api.disconnectVpn(id);
    } finally {
      const status = await api.getVpnStatus(id).catch(() => "unknown" as const);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteConnection(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEdit = (conn: Connection) => {
    setEditingConn(conn);
    setView("form");
  };

  const handleFormSave = async () => {
    await loadConnections();
    setView("list");
    setEditingConn(null);
  };

  const handleSudoAuth = async (password: string) => {
    await api.authenticateSudo(password);
    setSudoReady(true);
    setShowSudoModal(false);
  };

  // Fix 3: при импорте перезагружаем и connections и labels
  const handleLabelsChange = useCallback(async () => {
    await Promise.all([loadLabels(), loadConnections()]);
  }, [loadLabels, loadConnections]);

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
      if (filter.priority !== null && c.priority !== filter.priority)
        return false;
      for (const [id, value] of Object.entries(filter.labels)) {
        if (value && c.labels[id] !== value) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "priority") return (a.priority - b.priority) * dir;
      if (sortField === "status") return a.status.localeCompare(b.status) * dir;
      return (
        (a.labels["company"] ?? a.name).localeCompare(
          b.labels["company"] ?? b.name,
        ) * dir
      );
    });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {showSudoModal && (
        <SudoModal
          onAuth={handleSudoAuth}
          onClose={() => setShowSudoModal(false)}
        />
      )}

      <AppBar
        position="static"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar>
          {/* Fix 7: назад слева когда не list, иначе заголовок */}
          {view !== "list" ? (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => setView("list")}
              sx={{ mr: 2 }}
            >
              Назад
            </Button>
          ) : null}

          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}
          >
            L2TP Hub
          </Typography>

          {/* Fix 7: secondary actions слева от primary */}
          {view === "list" && (
            <>
              <Tooltip title="О приложении">
                <IconButton color="inherit" onClick={() => setView("about")}>
                  <Info />
                </IconButton>
              </Tooltip>
              <Tooltip title="Настройки">
                <IconButton
                  color="inherit"
                  onClick={() => setView("settings")}
                  sx={{ mr: 1 }}
                >
                  <Settings />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setEditingConn(null);
                  setView("form");
                }}
              >
                Добавить
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : view === "list" ? (
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
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : view === "about" ? (
          <About version={appVersion} onBack={() => setView("list")} />
        ) : view === "settings" ? (
          <SettingsPage labels={labels} onLabelsChange={handleLabelsChange} />
        ) : (
          <ConnectionForm
            initial={editingConn}
            labels={labels}
            onSave={handleFormSave}
            onCancel={() => setView("list")}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}
