import {
  Connection,
  ConnectionWithStatus,
} from "../../../typing/definitions.ts";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { Delete, Edit, Info, NetworkCheck, Stop, SwapHoriz } from "@mui/icons-material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../core/api";

export function ConnectButton({
  connection,
  onConnect,
  onDisconnect,
  onSwitch,
  connectingId,
  disconnectingId,
  anyActive,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSwitch: (id: string) => void;
  connectingId: string | null;
  disconnectingId: string | null;
  anyActive: boolean;
}) {
  const isThisConnecting = connectingId === connection.id;
  const isThisDisconnecting = disconnectingId === connection.id;

  // Active connection — show Disconnect
  if (connection.status === "connected") {
    return (
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={isThisDisconnecting ? <CircularProgress size={14} color="inherit" /> : <Stop sx={{ fontSize: 14 }} />}
        onClick={() => onDisconnect(connection.id)}
        disabled={isThisDisconnecting}
        sx={{ textTransform: "none", fontSize: 12, py: 0, px: 1.5, minWidth: 0 }}
      >
        Отключить
      </Button>
    );
  }

  // Connecting state
  if (connection.status === "connecting" || isThisConnecting) {
    return (
      <Button
        size="small"
        variant="outlined"
        disabled
        startIcon={<CircularProgress size={14} color="inherit" />}
        sx={{ textTransform: "none", fontSize: 12, py: 0, px: 1.5, minWidth: 0 }}
      >
        Подключение...
      </Button>
    );
  }

  // Disconnected, nothing active — show Connect
  if (!anyActive) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="success"
        onClick={() => onConnect(connection.id)}
        sx={{ textTransform: "none", fontSize: 12, py: 0, px: 1.5, minWidth: 0 }}
      >
        Подключить
      </Button>
    );
  }

  // Disconnected, something else active — show Switch
  return (
    <Button
      size="small"
      variant="outlined"
      color="warning"
      startIcon={<SwapHoriz sx={{ fontSize: 14 }} />}
      onClick={() => onSwitch(connection.id)}
      sx={{ textTransform: "none", fontSize: 12, py: 0, px: 1.5, minWidth: 0 }}
    >
      Переключить
    </Button>
  );
}

export function SwitchConfirmDialog({
  open,
  targetName,
  currentName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  targetName: string;
  currentName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Переключиться?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Подключение к «{currentName}» будет отключено.
          <br />
          Затем будет установлено подключение к «{targetName}».
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Отмена</Button>
        <Button color="warning" variant="contained" onClick={onConfirm} startIcon={<SwapHoriz />}>
          Переключиться
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ActionButtons({
  connection,
  onConnect,
  onDisconnect,
  onSwitch,
  onEdit,
  onDelete,
  connectingId,
  disconnectingId,
  deletingId,
  anyActive,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSwitch: (id: string) => void;
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
  connectingId: string | null;
  disconnectingId: string | null;
  deletingId: string | null;
  anyActive: boolean;
}) {
  const busy =
    ["connected", "connecting"].includes(connection.status) ||
    connectingId === connection.id ||
    disconnectingId === connection.id ||
    deletingId === connection.id;
  const [checking, setChecking] = useState(false);
  return (
    <>
      <ConnectButton
        connection={connection}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSwitch={onSwitch}
        connectingId={connectingId}
        disconnectingId={disconnectingId}
        anyActive={anyActive}
      />
      <Tooltip title="Редактировать">
        <span>
          <IconButton
            size="small"
            onClick={() => onEdit(connection)}
            disabled={busy}
            aria-label="Редактировать"
          >
            <Edit fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Удалить">
        <span>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(connection.id)}
            disabled={busy}
            aria-label="Удалить"
          >
            {deletingId === connection.id ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Delete fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          checking
            ? "Проверка..."
            : anyActive
              ? "Проверка недоступна во время активного VPN-подключения"
              : "Проверить доступность сервера"
        }
      >
        <span>
          <IconButton
            size="small"
            color="default"
            disabled={anyActive || busy || checking}
            onClick={async () => {
              setChecking(true);
              try {
                const result = await api.vpn.check(connection.id);
                if (result.ping && result.ipsec) {
                  toast.success("Сервер доступен, IPsec отвечает");
                } else if (result.ping) {
                  toast.success("Сервер доступен, IPsec не отвечает");
                } else if (result.ipsec) {
                  toast.success("IPsec отвечает, ICMP заблокирован");
                } else {
                  toast.error("Сервер не отвечает");
                }
              } catch (e) {
                toast.error(String(e));
              } finally {
                setChecking(false);
              }
            }}
          >
            {checking ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <NetworkCheck fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={"Скопировать ID подключения"}>
        <span>
          <IconButton
            size="small"
            color="default"
            disabled={busy}
            aria-label="Скопировать ID подключения"
            onClick={async () => {
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/plain": new Blob([connection.id], {
                    type: "text/plain",
                  }),
                }),
              ]);
              toast.success("ID скопирован", {
                style: {
                  background: "var(--mui-palette-background-paper)",
                  color: "var(--mui-palette-text-primary)",
                  border: "1px solid var(--mui-palette-divider)",
                },
              });
            }}
          >
            <Info fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
