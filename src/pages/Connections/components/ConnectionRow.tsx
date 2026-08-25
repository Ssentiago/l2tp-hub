import {
  Connection,
  ConnectionWithStatus,
  Label
} from "../../../typing/definitions.ts";
import { getDisplayTitle } from "../../../core/display";
import React, { useCallback, useState, useEffect, useRef } from "react";
import { Box, Chip, LinearProgress, TableCell, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "./ActionButtons.tsx";

const STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  connected: "success",
  connecting: "warning",
  reconnecting: "warning",
  disconnected: "default",
  unknown: "error"
};
export const STATUS_LABEL: Record<string, string> = {
  connected: "Подключён",
  connecting: "Подключение...",
  reconnecting: "Восстановление...",
  disconnected: "Отключён",
  unknown: "Неизвестно"
};

function LabelChips({
                      connection,
                      labels
                    }: {
  connection: Connection;
  labels: Label[];
}) {
  const entries = Object.entries(connection.labels)
    .map(([id, value]) => ({
      key: labels.find((l) => l.id === id)?.name ?? id,
      value
    }))
    .filter((e) => e.value);

  const visible = entries.slice(0, 2);
  const rest = entries.length - visible.length;

  return (
    <Box
      sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}
    >
      {visible.map((e) => (
        <Box
          key={e.key}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "999px",
            px: 1,
            py: "2px",
            fontSize: 11,
            gap: "4px"
          }}
        >
          <span style={{ color: "var(--mui-palette-text-secondary)" }}>
            {e.key}
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span
            style={{
              color: "var(--mui-palette-text-primary)",
              fontWeight: 500
            }}
          >
            {e.value}
          </span>
        </Box>
      ))}
      {rest > 0 && (
        <Chip label={`+${rest}`} size="small" sx={{ fontSize: 11 }} />
      )}
    </Box>
  );
}

export interface ConnectionRowProps {
  connection: ConnectionWithStatus;
  labels: Label[];
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
  hideCompanyLabel?: boolean;
  connectingId: string | null;
  disconnectingId: string | null;
  deletingId: string | null;
  anyActive: boolean;
}

export function ConnectionRow({
                                connection: c,
                                labels,
                                onConnect,
                                onDisconnect,
                                onEdit,
                                onDelete,
                                hideCompanyLabel = false,
                                connectingId,
                                disconnectingId,
                                deletingId,
                                anyActive
                              }: ConnectionRowProps) {
  const isBusy =
    connectingId === c.id ||
    disconnectingId === c.id ||
    deletingId === c.id;
  const [uptime, setUptime] = useState("");
  const fallbackSince = useRef<number | null>(null);

  useEffect(() => {
    if (c.status !== "connected") {
      setUptime("");
      fallbackSince.current = null;
      return;
    }
    if (!c.connected_since && fallbackSince.current === null) {
      fallbackSince.current = Math.floor(Date.now() / 1000);
    }
    const since = c.connected_since ?? fallbackSince.current!;
    const update = () => {
      const diff = Math.floor(Date.now() / 1000) - since;
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setUptime(h > 0 ? `${h}ч ${m}м` : `${m}м ${s}с`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [c.status, c.connected_since]);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      console.log("[onDoubleClick] status=", c.status, "id=", c.id);
      switch (c.status) {
        case "connected":
          onDisconnect(c.id);
          break;
        case "disconnected":
        case "unknown":
          if (!anyActive) {
            onConnect(c.id);
          }
          break;
        default:
          console.log("[onDoubleClick] no action for status=", c.status);
      }
    },
    [c.status, c.id, onDisconnect, onConnect, anyActive]
  );

  return (
    <TableRow
      hover
      onDoubleClick={onDoubleClick}
      sx={{
        opacity: isBusy ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <TableCell sx={{ position: "relative" }}>
        {isBusy && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
            }}
          />
        )}
        <Typography variant="body2" sx={{ fontWeight: 500, userSelect: "text" }}>
          {getDisplayTitle(c)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ userSelect: "text", whiteSpace: "nowrap" }}>
          {c.server}
          {uptime && (
            <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 0.5 }}>
              · ↑ {uptime}
            </Typography>
          )}
          {!uptime && c.last_connected_at && (
            <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 0.5 }}>
              · последний раз: {new Date(c.last_connected_at * 1000).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
          {c.connect_count > 0 && (
            <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
              · {c.connect_count} подключ.
            </Typography>
          )}
        </Typography>
        {c.status === "disconnected" && c.error && (
          <Typography variant="caption" color="error" sx={{ display: "block", fontSize: 11, mt: 0.25 }}>
            {c.error}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ width: 150, whiteSpace: "nowrap" }}>
        <Chip
          size="small"
          label={STATUS_LABEL[c.status] ?? c.status}
          color={STATUS_COLOR[c.status] ?? "default"}
          variant={c.status === "connected" ? "filled" : "outlined"}
        />
      </TableCell>
      <TableCell>
        <LabelChips connection={c} labels={labels} />
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <ActionButtons
            connection={c}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onEdit={onEdit}
            onDelete={onDelete}
            connectingId={connectingId}
            disconnectingId={disconnectingId}
            deletingId={deletingId}
            anyActive={anyActive}
          />
        </Box>
      </TableCell>
    </TableRow>
  );
}
