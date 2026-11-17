import { Box, Typography, Tooltip, CircularProgress, IconButton } from "@mui/material";
import { History } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { ConnectionWithStatus } from "../store";
import { useStore } from "../store";
import { StatusDot } from "./StatusDot";
import { ModeSegment } from "./ModeSegment";
import {
  getDisplayParts,
  highlightMatch,
  relativeTime,
  absoluteTime,
  formatBytes,
  formatDuration,
} from "../core/display";

interface Props {
  conn: ConnectionWithStatus;
  query: string;
  selected: boolean;
  title?: string;
  indent?: number;
  onSelect: () => void;
  onModeToggle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onHistory: () => void;
}

export function ConnectionRow({
  conn,
  query,
  selected,
  title,
  indent = 0,
  onSelect,
  onModeToggle,
  onConnect,
  onDisconnect,
  onHistory,
}: Props) {
  const { t } = useTranslation();
  const stats = useStore((s) => s.tunnelStats[conn.id]);
  const parts = title ? highlightMatch(title, query) : getDisplayParts(conn, query);
  const isActive = conn.status === "connected";
  const isBusy = conn.status === "connecting" || conn.status === "reconnecting";

  // Активный туннель: время текущей сессии и трафик по счётчикам интерфейса
  const sessionSecs = conn.connected_since
    ? Math.max(0, Math.floor(Date.now() / 1000) - conn.connected_since)
    : 0;
  const traffic = stats?.counters
    ? ` ↓${formatBytes(stats.counters.bytes_in)} ↑${formatBytes(stats.counters.bytes_out)}`
    : "";
  const liveMeta = isActive && conn.connected_since
    ? `${formatDuration(sessionSecs)}${traffic}`
    : null;
  const defaultMeta = conn.last_connected_at
    ? `${relativeTime(conn.last_connected_at)}${conn.connect_count > 0 ? ` · ${conn.connect_count}×` : ""}`
    : conn.connect_count > 0
      ? `${conn.connect_count}×`
      : "—";
  const meta = liveMeta ?? defaultMeta;

  // Суммарная статистика туннеля за всю историю сессий
  const totals = conn.total_uptime_secs > 0 || conn.total_bytes_in > 0 || conn.total_bytes_out > 0
    ? `${t("stats.total")}: ${formatDuration(conn.total_uptime_secs)} · ↓${formatBytes(conn.total_bytes_in)} ↑${formatBytes(conn.total_bytes_out)}`
    : "";
  const tooltip = [absoluteTime(conn.last_connected_at), totals].filter(Boolean).join(" · ");

  return (
    <Box
      onClick={onSelect}
      onDoubleClick={() => (isActive ? onDisconnect() : onConnect())}
      sx={{
        display: "flex",
        alignItems: "center",
        height: 44,
        px: 2,
        pl: indent > 0 ? `${16 + indent}px` : 2,
        gap: 1.5,
        cursor: "pointer",
        opacity: conn.status === "connecting" || conn.status === "reconnecting" ? 0.7 : 1,
        bgcolor: selected ? "rgba(255,255,255,0.06)" : "transparent",
        borderLeft: selected ? "2px solid" : "2px solid transparent",
        borderLeftColor: selected ? "primary.main" : "transparent",
        "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
      }}
    >
      {isBusy && selected ? (
        <CircularProgress size={10} sx={{ color: "warning.main", flexShrink: 0 }} />
      ) : (
        <StatusDot status={conn.status} />
      )}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {parts.map((p, i) =>
            p.match ? (
              <Box
                key={i}
                component="span"
                sx={{ bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 0.5, px: 0.25 }}
              >
                {p.text}
              </Box>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </Typography>
      </Box>
      <ModeSegment
        value={conn.tunnel_mode}
        onChange={onModeToggle}
        disabled={isActive}
        disabledModes={conn.split_routes.length === 0 ? ["split"] : []}
      />
      <Tooltip title={t("palette.historyTooltip")}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onHistory();
          }}
          sx={{ color: "text.disabled", "&:hover": { color: "text.primary" }, flexShrink: 0 }}
        >
          <History fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={tooltip} placement="left">
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            whiteSpace: "nowrap",
            minWidth: 80,
            textAlign: "right",
          }}
        >
          {meta}
        </Typography>
      </Tooltip>
    </Box>
  );
}
