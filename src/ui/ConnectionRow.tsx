import { Box, Typography, Tooltip, CircularProgress } from "@mui/material";
import type { ConnectionWithStatus } from "../typing/definitions";
import { StatusDot } from "./StatusDot";
import { ModeSegment } from "./ModeSegment";
import { getDisplayParts, highlightMatch, relativeTime, absoluteTime } from "../core/display";

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
}: Props) {
  const parts = title ? highlightMatch(title, query) : getDisplayParts(conn, query);
  const isActive = conn.status === "connected";
  const isBusy = conn.status === "connecting" || conn.status === "reconnecting";
  const meta = conn.last_connected_at
    ? `${relativeTime(conn.last_connected_at)}${conn.connect_count > 0 ? ` · ${conn.connect_count}×` : ""}`
    : conn.connect_count > 0
      ? `${conn.connect_count}×`
      : "—";

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
      <Tooltip title={absoluteTime(conn.last_connected_at)} placement="left">
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
