import { useEffect, useCallback, useState } from "react";
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { PaletteView } from "./ui/PaletteView";
import { ManageView } from "./ui/ManageView";
import { Settings } from "./pages/Settings/Settings";
import { SudoModal } from "./pages/Connections/components/SudoModal";
import { LogDrawer } from "./components/LogDrawer";
import { useStore } from "./store";
import { api } from "./core/api";
import { Toaster } from "react-hot-toast";

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
        "input, textarea": { userSelect: "text" },
      },
    },
  },
});

function AppContent() {
  const {
    viewMode,
    setViewMode,
    selectedKey,
    setSelectedKey,
    query,
    setQuery,
    connections,
    connectVpn,
    disconnectVpn,
    deleteConnection,
    loadConnections,
    loadLabels,
    loadWorkspaces,
    initVpnEventListener,
    checkHelper,
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    initVpnEventListener();
    loadLabels();
    loadWorkspaces();
    loadConnections();
    checkHelper();
    const iv = setInterval(checkHelper, 5000);
    // При показе окна — очистить поиск
    const unlisten = listen("app-shown", () => {
      setQuery("");
      setViewMode("palette");
    });
    return () => {
      clearInterval(iv);
      unlisten.then((f) => f());
    };
  }, []);

  // Global keyboard shortcuts
  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Esc
      if (e.key === "Escape") {
        e.preventDefault();
        if (viewMode === "manage") {
          setViewMode("palette");
          setQuery("");
        } else {
          if (query) {
            setQuery("");
          } else {
            getCurrentWindow().hide();
          }
        }
        return;
      }

      // ⌘Q — quit
      if (mod && e.key === "q") {
        e.preventDefault();
        api.system.quitApp();
        return;
      }

      // ⌘, — settings
      if (mod && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
        return;
      }

      // ⌘N — new connection
      if (mod && e.key === "n") {
        e.preventDefault();
        setSelectedKey(null);
        setViewMode("manage");
        return;
      }

      // ⌘E — edit selected
      if (mod && e.key === "e") {
        e.preventDefault();
        if (selectedKey) setViewMode("manage");
        return;
      }

      // ⌘D — disconnect active
      if (mod && e.key === "d") {
        e.preventDefault();
        const active = connections.find((c) => c.status === "connected");
        if (active) disconnectVpn(active.id);
        return;
      }

      // ⌘⌫ — delete selected
      if (mod && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        if (selectedKey) {
          const connId = selectedKey.split(":").slice(1).join(":");
          if (confirm("Удалить подключение?")) {
            deleteConnection(connId);
            setSelectedKey(null);
          }
        }
        return;
      }

      // ⌘1…⌘9 — switch workspace
      if (mod && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const { workspaces, switchWorkspace } = useStore.getState();
        if (idx < workspaces.length) switchWorkspace(workspaces[idx].id);
        return;
      }
    },
    [viewMode, query, selectedKey, connections, setViewMode, setQuery, setSelectedKey, disconnectVpn, deleteConnection],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {viewMode === "palette" ? <PaletteView /> : <ManageView />}
      </Box>
      {/* Settings overlay */}
      {showSettings && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 4,
          }}
          onClick={() => setShowSettings(false)}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              width: "90%",
              maxWidth: 700,
              maxHeight: "85vh",
              overflow: "auto",
              position: "relative",
              p: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              sx={{ position: "absolute", top: 8, right: 8 }}
              onClick={() => setShowSettings(false)}
            >
              <Close />
            </IconButton>
            <Settings />
          </Box>
        </Box>
      )}
      <LogDrawer open={showLog} onClose={() => setShowLog(false)} />
      <Toaster />
    </Box>
  );
}

export default function App() {
  const {
    sudoReady,
    authenticateSudo,
    keychainReady,
    requestKeychainAccess,
    helperStatusText,
    pollHelperStatus,
  } = useStore();

  const isMac = navigator.userAgent.includes("Mac");

  useEffect(() => {
    if (!isMac || (sudoReady && keychainReady)) return;
    const iv = setInterval(pollHelperStatus, 1000);
    return () => clearInterval(iv);
  }, [isMac, sudoReady, keychainReady]);

  const ready = isMac ? sudoReady && keychainReady : true;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isMac && !ready ? (
        <SudoModal
          sudoReady={sudoReady}
          keychainReady={keychainReady}
          helperStatusText={helperStatusText}
          onAuthSudo={authenticateSudo}
          onAuthKeychain={requestKeychainAccess}
        />
      ) : (
        <AppContent />
      )}
    </ThemeProvider>
  );
}
