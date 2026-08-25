import { useState, useEffect } from "react";
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
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { ConnectionForm } from "./pages/ConnectionForm/ConnectionForm";
import { Settings } from "./pages/Settings/Settings";
import { About } from "./pages/About/About";
import { LogDrawer } from "./components/LogDrawer";
import { WorkspaceSelector } from "./components/WorkspaceSelector";
import { Connections } from "./pages/Connections/Connections";
import { SudoModal } from "./pages/Connections/components/SudoModal";
import { useStore } from "./store";
import type { Connection } from "./typing/definitions";
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
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Main app — only mounts AFTER sudo is authenticated
// ---------------------------------------------------------------------------
function AppContent() {
  const [view, setView] = useState<View>("list");
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  const [showLog, setShowLog] = useState(false);

  const {
    labels,
    loadLabels,
    loadConnections,
    appVersion,
    loadAppVersion,
    loadWorkspaces,
    initVpnEventListener,
    helperReady,
    checkHelper,
  } = useStore();

  useEffect(() => {
    initVpnEventListener();
    loadAppVersion();
    loadLabels();
    loadWorkspaces();
    checkHelper();
    // Poll helper status каждые 5 сек
    const interval = setInterval(checkHelper, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (conn: Connection) => {
    setEditingConn(conn);
    setView("form");
  };

  const handleFormSave = async () => {
    await loadLabels();
    await loadConnections();
    setView("list");
    setEditingConn(null);
  };

  return (
    <>
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
          ) : (
            <WorkspaceSelector />
          )}

          <Box sx={{ flexGrow: 1 }} />

          {view === "list" && (
            <>
              <Tooltip title={helperReady ? "Сервис активен" : "Сервис не отвечает"}>
                <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                  {helperReady ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <ErrorIcon fontSize="small" color="error" />
                  )}
                </Box>
              </Tooltip>
              <Tooltip title="Лог / отладка">
                <IconButton color="inherit" onClick={() => setShowLog(true)} aria-label="Лог / отладка">
                  <Terminal />
                </IconButton>
              </Tooltip>
              <Tooltip title="О приложении">
                <IconButton color="inherit" onClick={() => setView("about")} aria-label="О приложении">
                  <Info />
                </IconButton>
              </Tooltip>
              <Tooltip title="Настройки">
                <IconButton
                  color="inherit"
                  onClick={() => setView("settings")}
                  sx={{ mr: 1 }}
                  aria-label="Настройки"
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
        {view === "form" ? (
          <ConnectionForm
            initialConnection={editingConn}
            labels={labels}
            onSave={handleFormSave}
            onCancel={() => {
              setView("list");
              setEditingConn(null);
            }}
          />
        ) : view === "settings" ? (
          <Settings />
        ) : view === "about" ? (
          <About version={appVersion} onBack={() => setView("list")} />
        ) : (
          <Connections labels={labels} onEdit={handleEdit} />
        )}
      </Box>
      <Toaster />
    </>
  );
}

// ---------------------------------------------------------------------------
// Root — SudoModal gate (macOS only), nothing else renders until authenticated
// ---------------------------------------------------------------------------
export default function App() {
  const { sudoReady, authenticateSudo, keychainReady, requestKeychainAccess, helperStatusText, pollHelperStatus } = useStore();

  const isMac = navigator.userAgent.includes("Mac");

  // Poll helper status пока не ready (показывает "Ожидание сервиса (1/3)..." и т.д.)
  useEffect(() => {
    if (!isMac || (sudoReady && keychainReady)) return;
    const interval = setInterval(pollHelperStatus, 1000);
    return () => clearInterval(interval);
  }, [isMac, sudoReady, keychainReady]);

  const handleSudoAuth = async () => {
    await authenticateSudo();
  };

  const handleKeychainAuth = async () => {
    await requestKeychainAccess();
  };

  // Windows — сразу ready, без авторизации
  const ready = isMac ? (sudoReady && keychainReady) : true;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isMac && !ready ? (
        <SudoModal
          sudoReady={sudoReady}
          keychainReady={keychainReady}
          helperStatusText={helperStatusText}
          onAuthSudo={handleSudoAuth}
          onAuthKeychain={handleKeychainAuth}
        />
      ) : (
        <AppContent />
      )}
    </ThemeProvider>
  );
}
