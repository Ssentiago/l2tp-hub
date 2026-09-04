import {
  Connection,
  ConnectionWithStatus,
  Label
} from "../../../typing/definitions.ts";
import { getDisplayTitle } from "../../../core/display";
import React, { useCallback, useState, useEffect, useRef } from "react";
import { Box, Chip, LinearProgress, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { ErrorOutlined } from "@mui/icons-material";
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
  onSwitch: (id: string) => void;
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
  hideCompanyLabel?: boolean;
  isLast?: boolean;
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
                                onSwitch,
                                onEdit,
                                onDelete,
                                hideCompanyLabel = false,
                                isLast = false,
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

  const [errorDismissed, setErrorDismissed] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  // Сброс dismissed при появлении новой ошибки
  useEffect(() => {
    if (c.error) {
      setErrorDismissed(false);
      setErrorKey((k) => k + 1);
    }
  }, [c.error]);

  const isActive = c.status === "connected";

  return (
    <TableRow
      hover
      onDoubleClick={onDoubleClick}
      sx={{
        opacity: isBusy ? 0.6 : 1,
        transition: "opacity 0.2s",
        ...(isActive && {
          bgcolor: "action.selected",
          borderLeft: "3px solid",
          borderLeftColor: "success.main",
          "& .MuiTableCell-root": {
            borderBottomColor: "success.dark",
          },
        }),
      }}
    >
      <TableCell sx={{ position: "relative", ...(hideCompanyLabel && { pl: 3.5 }) }}>
        {hideCompanyLabel && (
          <Box
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "text.disabled",
              fontSize: 10,
            }}
          >
            <Box sx={{ width: 8, height: 1, bgcolor: "currentColor" }} />
            <Box sx={{ width: 1, height: isLast ? 8 : 16, bgcolor: "currentColor" }} />
          </Box>
        )}
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
          {c.tunnel_mode === "split" && (
            <Typography component="span" variant="caption" sx={{ fontSize: 10, ml: 0.5, color: "info.main", fontWeight: 500 }}>
              · раздельный
            </Typography>
          )}
        </Typography>
        {c.status === "disconnected" && c.error && !errorDismissed && (
          <Tooltip
            key={errorKey}
            title={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Ошибка подключения
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {c.error}
                </Typography>
              </Box>
            }
            arrow
            onClose={() => setErrorDismissed(true)}
            slotProps={{
              tooltip: { sx: { maxWidth: 320, bgcolor: "error.dark" } },
            }}
          >
            <Box
              component="span"
              onMouseEnter={(e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.animationPlayState = "paused";
                (e.currentTarget as HTMLElement).style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.animationPlayState = "running";
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                ml: 0.5,
                cursor: "pointer",
                animation: "errorBounce 1.5s ease-in-out infinite",
                transition: "transform 0.15s ease",
                "@keyframes errorBounce": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-3px)" },
                },
              }}
            >
              <ErrorOutlined sx={{ fontSize: 16, color: "error.main" }} />
            </Box>
          </Tooltip>
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
            onSwitch={onSwitch}
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
