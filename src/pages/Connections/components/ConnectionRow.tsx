import {
  Connection,
  ConnectionWithStatus,
  Label,
} from "../../../typing/definitions.ts";
import React, { useCallback } from "react";
import { Box, Chip, TableCell, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "./ActionButtons.tsx";

const STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  connected: "success",
  connecting: "warning",
  disconnected: "default",
  unknown: "error",
};
export const STATUS_LABEL: Record<string, string> = {
  connected: "Подключён",
  connecting: "Подключение...",
  disconnected: "Отключён",
  unknown: "Неизвестно",
};

function LabelChips({
  connection,
  labels,
}: {
  connection: Connection;
  labels: Label[];
}) {
  const entries = Object.entries(connection.labels)
    .map(([id, value]) => ({
      key: labels.find((l) => l.id === id)?.name ?? id,
      value,
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
            gap: "4px",
          }}
        >
          <span style={{ color: "var(--mui-palette-text-secondary)" }}>
            {e.key}
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span
            style={{
              color: "var(--mui-palette-text-primary)",
              fontWeight: 500,
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
}

export function ConnectionRow({
  connection: c,
  labels,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
}: ConnectionRowProps) {
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
          onConnect(c.id);
          break;
        default:
          console.log("[onDoubleClick] no action for status=", c.status);
      }
    },
    [c.status, c.id, onDisconnect, onConnect],
  );

  return (
    <TableRow hover onDoubleClick={onDoubleClick}>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {c.labels["company"] || c.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {c.server}
        </Typography>
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
          />
        </Box>
      </TableCell>
    </TableRow>
  );
}
