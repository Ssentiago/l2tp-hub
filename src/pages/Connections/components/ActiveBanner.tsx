import { Box, Button, Chip, CircularProgress, Collapse, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { FiberManualRecord, Search, Stop } from "@mui/icons-material";
import { ConnectionWithStatus } from "../../../typing/definitions";
import { useState, useEffect, useRef } from "react";
import { api } from "../../../core/api";
import { listen } from "@tauri-apps/api/event";
import { SubnetEditor } from "../../../components/SubnetEditor";

interface Props {
  active: ConnectionWithStatus | null;
  connecting: ConnectionWithStatus | null;
  onDisconnect: (id: string) => void;
  onModeChanged?: () => void;
}

function formatUptime(since: number | null): string {
  if (!since) return "";
  const diff = Math.floor(Date.now() / 1000) - since;
  if (diff < 0) return "";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

interface ScanEvent {
  id: string;
  routes: string[];
  count: number;
}

export function ActiveBanner({ active, connecting, onDisconnect, onModeChanged }: Props) {
  const [uptime, setUptime] = useState("");
  const [switching, setSwitching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [showScanLogs, setShowScanLogs] = useState(false);
  const [pendingRoutes, setPendingRoutes] = useState<string[] | null>(null);
  const [editingRoutes, setEditingRoutes] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active?.connected_since) {
      setUptime("");
      return;
    }
    const update = () => setUptime(formatUptime(active.connected_since));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [active?.connected_since, active?.id]);

  // Слушаем app:log events для фильтрации scan-related логов
  useEffect(() => {
    if (!scanning) return;

    const setup = async () => {
      const unlisten = await listen<{ message: string; timestamp: number }>(
        "app:log",
        (event) => {
          const msg = event.payload.message;
          if (msg.includes("[scan]")) {
            setScanLogs((prev) => [...prev, msg]);
            // Автоскролл
            setTimeout(() => {
              logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
            }, 50);
          }
        },
      );
      unlistenRef.current = unlisten;
    };
    setup();

    return () => {
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [scanning]);

  const [showScanPrompt, setShowScanPrompt] = useState(false);

  const handleModeChange = async (_: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (!newMode || !active || newMode === active.tunnel_mode || switching) return;

    // Если переключаем на split и нет routes — просто показываем предложение
    if (newMode === "split" && (!active.split_routes || active.split_routes.length === 0)) {
      setShowScanPrompt(true);
      return;
    }

    // Если переключаем на full — сразу переключаем
    setSwitching(true);
    try {
      await api.vpn.switchTunnelMode(active.id, newMode);
      onModeChanged?.();
      setShowScanPrompt(false);
    } catch (e) {
      console.error("switch_tunnel_mode failed:", e);
    } finally {
      setSwitching(false);
    }
  };

  const startScan = async () => {
    if (!active || scanning) return;
    setScanning(true);
    setScanLogs([]);
    setShowScanLogs(true);
    setPendingRoutes(null);

    try {
      const routes = await api.vpn.scanRoutes(active.id);
      setPendingRoutes(routes);
      setEditingRoutes(routes);
    } catch (e) {
      setScanLogs((prev) => [...prev, `Ошибка: ${e}`]);
    } finally {
      setScanning(false);
    }
  };

  const confirmSplit = async () => {
    if (!active || !editingRoutes.length || switching) return;
    setSwitching(true);
    try {
      // Сохраняем routes в профиль через save connection
      // Сначала получаем текущий connection, обновляем routes, сохраняем
      const conns = await api.connections.getAll();
      const conn = conns.find((c) => c.id === active.id);
      if (conn) {
        await api.connections.save({
          id: conn.id,
          display_name: conn.display_name,
          server: conn.server,
          username: conn.username,
          password: "",
          shared_secret: "",
          labels: conn.labels,
          tunnel_mode: "split",
          split_routes: editingRoutes,
        });
      }
      // Переключаем на split
      await api.vpn.switchTunnelMode(active.id, "split");
      setPendingRoutes(null);
      setShowScanLogs(false);
      onModeChanged?.();
    } catch (e) {
      console.error("confirmSplit failed:", e);
    } finally {
      setSwitching(false);
    }
  };

  const cancelScan = () => {
    setPendingRoutes(null);
    setShowScanLogs(false);
    setShowScanPrompt(false);
    setScanLogs([]);
  };

  // Connecting state
  if (connecting) {
    return (
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 2, py: 1, mb: 1.5, borderRadius: 1.5,
        bgcolor: "warning.dark", border: "1px solid", borderColor: "warning.main", opacity: 0.9,
      }}>
        <FiberManualRecord sx={{ fontSize: 10, color: "warning.main", animation: "blink 1s infinite", "@keyframes blink": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Подключение: {connecting.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">{connecting.server}</Typography>
      </Box>
    );
  }

  // No active connection
  if (!active) {
    return (
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 2, py: 1, mb: 1.5, borderRadius: 1.5,
        bgcolor: "action.hover", border: "1px solid", borderColor: "divider",
      }}>
        <FiberManualRecord sx={{ fontSize: 10, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary">Нет активного подключения</Typography>
      </Box>
    );
  }

  // Active connection
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 2, py: 1, borderRadius: 1.5,
        bgcolor: "success.dark", border: "1px solid", borderColor: "success.main",
      }}>
        <FiberManualRecord sx={{ fontSize: 10, color: "success.main" }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{active.name}</Typography>
        {active.labels?.company && (
          <Chip label={active.labels.company} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        )}
        <Typography variant="caption" color="text.secondary">{active.server}</Typography>
        {uptime && (
          <Typography variant="caption" color="text.disabled">· {uptime}</Typography>
        )}
        <Box sx={{ flex: 1 }} />

        <Tooltip title={switching ? "Переключение..." : "Режим маршрутизации"}>
          <ToggleButtonGroup
            value={active.tunnel_mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            disabled={switching || scanning}
            sx={{
              height: 24,
              "& .MuiToggleButton-root": {
                px: 1, py: 0, fontSize: 11, textTransform: "none",
                borderColor: "rgba(255,255,255,0.2)", color: "text.secondary",
                "&.Mui-selected": {
                  bgcolor: "rgba(255,255,255,0.1)", color: "text.primary",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                },
              },
            }}
          >
            <ToggleButton value="full">Полный</ToggleButton>
            <ToggleButton value="split">Раздельный</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>

        <Button
          size="small" variant="outlined" color="inherit"
          startIcon={<Stop sx={{ fontSize: 14 }} />}
          onClick={() => onDisconnect(active.id)}
          sx={{ textTransform: "none", fontSize: 12, py: 0.25, px: 1.5, borderColor: "rgba(255,255,255,0.3)", color: "text.secondary", "&:hover": { borderColor: "error.main", color: "error.main" } }}
        >
          Отключить
        </Button>
      </Box>

      {/* Scan flow: предложение → логи → результат */}
      <Collapse in={showScanPrompt || showScanLogs}>
        <Box sx={{
          mt: 0.5, p: 1.5, borderRadius: 1.5,
          bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
        }}>
          {/* Предложение просканировать (когда showScanPrompt && !showScanLogs) */}
          {showScanPrompt && !showScanLogs && !scanning && !pendingRoutes && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Для раздельного режима нужно указать подсети, которые пойдут через VPN.
                Можно просканировать их автоматически через текущее подключение.
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small" variant="contained" color="primary"
                  startIcon={<Search sx={{ fontSize: 14 }} />}
                  onClick={() => { setShowScanPrompt(false); startScan(); }}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  Просканировать
                </Button>
                <Button
                  size="small" variant="outlined"
                  onClick={() => setShowScanPrompt(false)}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  Ввести вручную
                </Button>
                <Button
                  size="small" variant="text"
                  onClick={() => { setShowScanPrompt(false); cancelScan(); }}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  Отмена
                </Button>
              </Box>
            </Box>
          )}

          {/* Scanning in progress */}
          {scanning && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Сканирование сетей через VPN...
              </Typography>
            </Box>
          )}

          {/* Scan logs */}
          {scanLogs.length > 0 && (
            <Box
              ref={logRef}
              sx={{
                maxHeight: 160, overflow: "auto", mb: 1, p: 1,
                bgcolor: "grey.900", borderRadius: 1, fontFamily: "monospace",
                fontSize: 11, lineHeight: 1.6,
              }}
            >
              {scanLogs.map((log, i) => (
                <Box key={i} sx={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      fontFamily: "monospace", fontSize: 11,
                      color: log.includes("✓") ? "success.light"
                        : log.includes("✗") ? "warning.light"
                        : log.includes("Ошибка") ? "error.light"
                        : "text.secondary",
                    }}
                  >
                    {log}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Scan result — SubnetEditor для редактирования найденных routes */}
          {pendingRoutes && !scanning && (
            <Box>
              {pendingRoutes.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  Подсети не обнаружены. Добавьте вручную.
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Обнаружено {pendingRoutes.length} подсетей. Отредактируйте при необходимости:
                </Typography>
              )}
              <Box sx={{ mb: 1.5 }}>
                <SubnetEditor
                  routes={editingRoutes}
                  onChange={setEditingRoutes}
                  label=""
                  placeholder="Добавить подсеть (CIDR, маска, диапазон)"
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small" variant="contained" color="primary"
                  disabled={editingRoutes.length === 0 || switching}
                  onClick={confirmSplit}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  Переключить на раздельный ({editingRoutes.length} сетей)
                </Button>
                <Button
                  size="small" variant="text"
                  onClick={cancelScan}
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  Отмена
                </Button>
              </Box>
            </Box>
          )}

        </Box>
      </Collapse>
    </Box>
  );
}