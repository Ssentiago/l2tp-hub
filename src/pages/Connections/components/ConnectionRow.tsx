import {
  Connection,
  ConnectionWithStatus,
  Label
} from "../../../typing/definitions.ts";
import { getDisplayTitle } from "../../../core/display";
import React, { useCallback } from "react";
import { Box, Chip, LinearProgress, TableCell, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "./ActionButtons.tsx";

const STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  connected: "success",
  connecting: "warning",
  disconnected: "default",
  unknown: "error"
};
export const STATUS_LABEL: Record<string, string> = {
  connected: "Подключён",
  connecting: "Подключение...",
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
    [c.status, c.id, onDisconnect, onConnect]
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
        <Typography variant="caption" color="text.secondary" sx={{ userSelect: "text" }}>
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
