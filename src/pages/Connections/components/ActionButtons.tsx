import {
  Connection,
  ConnectionWithStatus,
} from "../../../typing/definitions.ts";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, CircularProgress } from "@mui/material";
import { Delete, Edit, Info, MoreVert, NetworkCheck, Stop, Subject, SwapHoriz } from "@mui/icons-material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../core/api";

export function ConnectButton({
  connection,
  onConnect,
  onDisconnect,
  onSwitch,
  onModeSwitch,
  connectingId,
  disconnectingId,
  anyActive,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string, mode: "full" | "split") => void;
  onDisconnect: (id: string) => void;
  onSwitch: (id: string) => void;
  onModeSwitch?: (id: string, mode: "full" | "split") => void;
  connectingId: string | null;
  disconnectingId: string | null;
  anyActive: boolean;
}) {
  const isThisConnecting = connectingId === connection.id;
  const isThisDisconnecting = disconnectingId === connection.id;

  // Active connection — show current mode with switch option
  if (connection.status === "connected") {
    const hasSplitRoutes = (connection.split_routes?.length ?? 0) > 0;
    return (
      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
        <Tooltip title={hasSplitRoutes ? "Только корпоративные сети через VPN" : "Укажите подсети в настройках"}>
          <span>
            <Button
              size="small"
              variant={connection.tunnel_mode === "split" ? "contained" : "outlined"}
              color={connection.tunnel_mode === "split" ? "info" : "inherit"}
              disabled={!onModeSwitch || !hasSplitRoutes}
              onClick={() => onModeSwitch?.(connection.id, "split")}
              sx={{
                textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0,
                ...(connection.tunnel_mode === "split" && { fontWeight: 600 }),
              }}
            >
              {connection.tunnel_mode === "split" ? "Сплит ✓" : "Сплит"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Весь трафик через VPN">
          <Button
            size="small"
            variant={connection.tunnel_mode === "full" ? "contained" : "outlined"}
            color={connection.tunnel_mode === "full" ? "success" : "inherit"}
            disabled={!onModeSwitch}
            onClick={() => onModeSwitch?.(connection.id, "full")}
            sx={{
              textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0,
              ...(connection.tunnel_mode === "full" && { fontWeight: 600 }),
            }}
          >
            {connection.tunnel_mode === "full" ? "Фулл ✓" : "Фулл"}
          </Button>
        </Tooltip>
        <Tooltip title="Отключить">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDisconnect(connection.id)}
            disabled={isThisDisconnecting}
          >
            {isThisDisconnecting ? <CircularProgress size={16} color="inherit" /> : <Stop sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Box>
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

  // Disconnected — two mode buttons
  const canConnect = !anyActive;
  const hasSplitRoutes = (connection.split_routes?.length ?? 0) > 0;
  return (
    <Box sx={{ display: "inline-flex", gap: 0.5 }}>
      <Tooltip title={!canConnect ? "Сначала отключите текущее подключение" : !hasSplitRoutes ? "Укажите подсети в настройках" : "Только корпоративные сети через VPN"}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="info"
            disabled={!canConnect || !hasSplitRoutes}
            onClick={() => onConnect(connection.id, "split")}
            sx={{ textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0 }}
          >
            Сплит
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={canConnect ? "Весь трафик через VPN" : "Сначала отключите текущее подключение"}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="success"
            disabled={!canConnect}
            onClick={() => onConnect(connection.id, "full")}
            sx={{ textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0 }}
          >
            Фулл
          </Button>
        </span>
      </Tooltip>
    </Box>
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
  onConnectWithMode,
  onDisconnect,
  onSwitch,
  onModeSwitch,
  onEdit,
  onDelete,
  onShowLogs,
  connectingId,
  disconnectingId,
  deletingId,
  anyActive,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onConnectWithMode?: (id: string, mode: "full" | "split") => void;
  onDisconnect: (id: string) => void;
  onSwitch: (id: string) => void;
  onModeSwitch?: (id: string, mode: "full" | "split") => void;
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
  onShowLogs?: (id: string) => void;
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  return (
    <>
      <ConnectButton
        connection={connection}
        onConnect={onConnectWithMode ?? ((id, _mode) => onConnect(id))}
        onDisconnect={onDisconnect}
        onSwitch={onSwitch}
        onModeSwitch={onModeSwitch}
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
      <Tooltip title="Ещё">
        <span>
          <IconButton size="small" onClick={openMenu} disabled={busy} aria-label="Ещё">
            <MoreVert fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          disabled={anyActive || checking}
          onClick={async () => {
            closeMenu();
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
          <ListItemIcon>
            {checking ? <CircularProgress size={18} /> : <NetworkCheck fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Проверить доступность</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={async () => {
            closeMenu();
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/plain": new Blob([connection.id], { type: "text/plain" }),
              }),
            ]);
            toast.success("ID скопирован");
          }}
        >
          <ListItemIcon><Info fontSize="small" /></ListItemIcon>
          <ListItemText>Скопировать ID</ListItemText>
        </MenuItem>
        {onShowLogs && (
          <MenuItem onClick={() => { closeMenu(); onShowLogs(connection.id); }}>
            <ListItemIcon><Subject fontSize="small" /></ListItemIcon>
            <ListItemText>Логи</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => { closeMenu(); onDelete(connection.id); }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            {deletingId === connection.id ? (
              <CircularProgress size={18} color="error" />
            ) : (
              <Delete fontSize="small" sx={{ color: "error.main" }} />
            )}
          </ListItemIcon>
          <ListItemText>Удалить</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
