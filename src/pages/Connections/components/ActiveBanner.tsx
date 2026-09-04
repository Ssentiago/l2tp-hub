import { Box, Button, Chip, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { FiberManualRecord, Stop, SwapHoriz } from "@mui/icons-material";
import { ConnectionWithStatus } from "../../../typing/definitions";
import { useState, useEffect } from "react";
import { api } from "../../../core/api";

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

export function ActiveBanner({ active, connecting, onDisconnect, onModeChanged }: Props) {
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

  const handleModeChange = async (_: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (!newMode || !active || newMode === active.tunnel_mode || switching) return;
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1,
          mb: 1.5,
          borderRadius: 1.5,
          bgcolor: "warning.dark",
          border: "1px solid",
          borderColor: "warning.main",
          opacity: 0.9,
        }}
      >
        <FiberManualRecord sx={{ fontSize: 10, color: "warning.main", animation: "blink 1s infinite", "@keyframes blink": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Подключение: {connecting.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {connecting.server}
        </Typography>
      </Box>
    );
  }

  // No active connection
  if (!active) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          mb: 1.5,
          borderRadius: 1.5,
          bgcolor: "action.hover",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <FiberManualRecord sx={{ fontSize: 10, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary">
          Нет активного подключения
        </Typography>
      </Box>
    );
  }

  // Active connection
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
        mb: 1.5,
        borderRadius: 1.5,
        bgcolor: "success.dark",
        border: "1px solid",
        borderColor: "success.main",
      }}
    >
      <FiberManualRecord sx={{ fontSize: 10, color: "success.main" }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {active.name}
      </Typography>
      {active.labels?.company && (
        <Chip
          label={active.labels.company}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />
      )}
      <Typography variant="caption" color="text.secondary">
        {active.server}
      </Typography>
      {uptime && (
        <Typography variant="caption" color="text.disabled">
          · {uptime}
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />

      {/* Tunnel mode switcher */}
      <Tooltip title={switching ? "Переключение..." : "Режим маршрутизации"}>
        <ToggleButtonGroup
          value={active.tunnel_mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          disabled={switching}
          sx={{
            height: 24,
            "& .MuiToggleButton-root": {
              px: 1, py: 0, fontSize: 11, textTransform: "none",
              borderColor: "rgba(255,255,255,0.2)",
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: "rgba(255,255,255,0.1)",
                color: "text.primary",
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
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<Stop sx={{ fontSize: 14 }} />}
        onClick={() => onDisconnect(active.id)}
        sx={{ textTransform: "none", fontSize: 12, py: 0.25, px: 1.5, borderColor: "rgba(255,255,255,0.3)", color: "text.secondary", "&:hover": { borderColor: "error.main", color: "error.main" } }}
      >
        Отключить
      </Button>
    </Box>
  );
}