import { Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import { FiberManualRecord, Stop } from "@mui/icons-material";
import { ConnectionWithStatus, Label } from "../../../typing/definitions";
import { getDisplayTitle } from "../../../core/display";
import { useState, useEffect } from "react";
import { api } from "../../../core/api";

interface Props {
  active: ConnectionWithStatus | null;
  connecting: ConnectionWithStatus | null;
  labels: Label[];
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

export function ActiveBanner({ active, connecting, labels, onDisconnect, onModeChanged }: Props) {
  const [uptime, setUptime] = useState("");
  const [switching, setSwitching] = useState(false);

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

  const hasSplitRoutes = (active?.split_routes?.length ?? 0) > 0;

  const handleModeSwitch = async (newMode: "full" | "split") => {
    if (!active || newMode === active.tunnel_mode || switching) return;
    // Сплит разрешён только если есть подсети
    if (newMode === "split" && !hasSplitRoutes) return;

    setSwitching(true);
    try {
      await api.vpn.switchTunnelMode(active.id, newMode);
      onModeChanged?.();
    } catch (e) {
      console.error("switch_tunnel_mode failed:", e);
    } finally {
      setSwitching(false);
    }
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
          Подключение: {getDisplayTitle(connecting)}
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
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1.5,
      px: 2, py: 1, mb: 1.5, borderRadius: 1.5,
      bgcolor: "success.dark", border: "1px solid", borderColor: "success.main",
    }}>
      <FiberManualRecord sx={{ fontSize: 10, color: "success.main" }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{getDisplayTitle(active)}</Typography>
      {labels.length > 0 && (() => {
        const entries = Object.entries(active.labels)
          .map(([id, value]) => ({
            key: labels.find((l) => l.id === id)?.name ?? id,
            value
          }))
          .filter((e) => e.value);
        const visible = entries.slice(0, 2);
        const rest = entries.length - visible.length;
        return (
          <>
            {visible.map((e) => (
              <Box
                key={e.key}
                sx={{
                  display: "inline-flex", alignItems: "center",
                  border: "1px solid", borderColor: "rgba(255,255,255,0.2)",
                  borderRadius: "999px", px: 1, py: "2px", fontSize: 11, gap: "4px",
                }}
              >
                <span style={{ color: "var(--mui-palette-text-secondary)" }}>{e.key}</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span style={{ color: "var(--mui-palette-text-primary)", fontWeight: 500 }}>{e.value}</span>
              </Box>
            ))}
            {rest > 0 && <Chip label={`+${rest}`} size="small" sx={{ fontSize: 11 }} />}
          </>
        );
      })()}
      <Typography variant="caption" color="text.secondary">{active.server}</Typography>
      {uptime && (
        <Typography variant="caption" color="text.disabled">· {uptime}</Typography>
      )}
      <Box sx={{ flex: 1 }} />

      <Tooltip title={hasSplitRoutes ? "Только корпоративные сети через VPN" : "Укажите подсети в настройках подключения"}>
        <span>
          <Button
            size="small"
            variant={active.tunnel_mode === "split" ? "contained" : "outlined"}
            color={active.tunnel_mode === "split" ? "info" : "inherit"}
            disabled={switching || !hasSplitRoutes}
            onClick={() => handleModeSwitch("split")}
            sx={{
              textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0,
              borderColor: active.tunnel_mode !== "split" ? "rgba(255,255,255,0.3)" : undefined,
              color: active.tunnel_mode !== "split" ? "text.secondary" : undefined,
              ...(active.tunnel_mode === "split" && { fontWeight: 600 }),
            }}
          >
            {active.tunnel_mode === "split" ? "Сплит ✓" : "Сплит"}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Весь трафик через VPN">
        <Button
          size="small"
          variant={active.tunnel_mode === "full" ? "contained" : "outlined"}
          color={active.tunnel_mode === "full" ? "success" : "inherit"}
          disabled={switching}
          onClick={() => handleModeSwitch("full")}
          sx={{
            textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0,
            borderColor: active.tunnel_mode !== "full" ? "rgba(255,255,255,0.3)" : undefined,
            color: active.tunnel_mode !== "full" ? "text.secondary" : undefined,
            ...(active.tunnel_mode === "full" && { fontWeight: 600 }),
          }}
        >
          {active.tunnel_mode === "full" ? "Фулл ✓" : "Фулл"}
        </Button>
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
  );
}
