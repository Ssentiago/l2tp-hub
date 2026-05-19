import { useState, useEffect, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  Settings as SettingsIcon,
  Info,
  Terminal,
} from "@mui/icons-material";
import { api } from "./core/api";
import { ConnectionForm } from "./pages/ConnectionForm/ConnectionForm";
import { Settings } from "./pages/Settings/Settings";
import { About } from "./pages/About/About";
import { LogDrawer } from "./components/LogDrawer";
import { Connections } from "./pages/Connections/Connections";
import { getVersion } from "@tauri-apps/api/app";
import type { Connection, Label } from "./typing/definitions";
import { Toaster } from "react-hot-toast";

type View = "list" | "form" | "settings" | "about";

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
  const [view, setView] = useState<View>("list");
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [appVersion, setAppVersion] = useState("...");
  const [showLog, setShowLog] = useState(false);

  const loadLabels = useCallback(async () => {
    setLabels(await api.labels.getAll());
  }, []);

  useEffect(() => {
    (async () => {
      const appVersion = await getVersion();
      setAppVersion(appVersion);
      await loadLabels();
    })();
  }, [loadLabels]);

  const handleEdit = (conn: Connection) => {
    setEditingConn(conn);
    setView("form");
  };

  const handleFormSave = async () => {
    await loadLabels();
    setView("list");
    setEditingConn(null);
  };

  const handleLabelsChange = useCallback(async () => {
    await loadLabels();
  }, [loadLabels]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LogDrawer open={showLog} onClose={() => setShowLog(false)} />

      <AppBar
        position="static"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar>
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

          {view === "list" && (
            <>
              <Tooltip title="Лог / отладка">
                <IconButton color="inherit" onClick={() => setShowLog(true)}>
                  <Terminal />
                </IconButton>
              </Tooltip>
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
                  <SettingsIcon />
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
        {view === "list" ? (
          <Connections labels={labels} onEdit={handleEdit} />
        ) : view === "about" ? (
          <About version={appVersion} onBack={() => setView("list")} />
        ) : view === "settings" ? (
          <Settings labels={labels} onLabelsChange={handleLabelsChange} />
        ) : (
          <ConnectionForm
            initialConnection={editingConn}
            labels={labels}
            onSave={handleFormSave}
            onCancel={() => setView("list")}
          />
        )}
      </Box>
      <Toaster />
    </ThemeProvider>
  );
}
