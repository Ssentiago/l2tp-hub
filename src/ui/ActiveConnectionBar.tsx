import { useState, useEffect } from "react";
import { Box, Typography, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { StopCircle } from "@mui/icons-material";
import type { ConnectionWithStatus } from "../typing/definitions";
import { getTitle } from "../core/display";

interface Props {
  conn: ConnectionWithStatus;
  onDisconnect: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  connecting: "Подключение…",
  reconnecting: "Переподключение…",
};

export function ActiveConnectionBar({ conn, onDisconnect }: Props) {
  const [uptime, setUptime] = useState("");
  const isActive = conn.status === "connected";
  const isBusy = conn.status === "connecting" || conn.status === "reconnecting";

  useEffect(() => {
    if (!isActive) {
      setUptime("");
      return;
    }
    const since = conn.connected_since ?? Math.floor(Date.now() / 1000);
    const update = () => {
      const diff = Math.floor(Date.now() / 1000) - since;
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setUptime(h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [conn.status, conn.connected_since]);

  const bg = isActive ? "rgba(76, 175, 80, 0.12)" : "rgba(255, 193, 7, 0.12)";
  const dotColor = isActive ? "success.main" : "warning.main";
  const textColor = isActive ? "success.light" : "warning.light";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: 40,
        px: 2,
        bgcolor: bg,
        borderBottom: "1px solid",
        borderColor: "divider",
        gap: 1.5,
        animation: "barIn 120ms ease-out",
        "@keyframes barIn": {
          from: { height: 0, opacity: 0 },
          to: { height: 40, opacity: 1 },
        },
      }}
    >
      {isBusy ? (
        <CircularProgress size={12} sx={{ color: dotColor, flexShrink: 0 }} />
      ) : (
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dotColor, flexShrink: 0 }} />
      )}
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: textColor }}>
        {getTitle(conn)}
      </Typography>
      {isBusy ? (
        <Typography sx={{ fontSize: 12, color: "warning.light", fontWeight: 500 }}>
          {STATUS_TEXT[conn.status] ?? "…"}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{uptime}</Typography>
      )}
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Отключить (⌘D)">
        <IconButton
          size="small"
          onClick={onDisconnect}
          disabled={isBusy}
          sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
        >
          <StopCircle fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
