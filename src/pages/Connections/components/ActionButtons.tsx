import {
  Connection,
  ConnectionWithStatus,
} from "../../../typing/definitions.ts";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, CircularProgress } from "@mui/material";
import { Delete, Edit, Info, MoreVert, NetworkCheck, Stop, Subject, SwapHoriz } from "@mui/icons-material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../core/api";

/// Находит подсети из routes, которые пересекаются с активными split-подключениями
function findOverlappingRoutes(routes: string[], activeConns: ConnectionWithStatus[], excludeId: string): string[] {
  const activeRoutes: string[] = [];
  for (const c of activeConns) {
    if (c.id !== excludeId && c.tunnel_mode === "split" && c.split_routes) {
      activeRoutes.push(...c.split_routes);
    }
  }
  if (activeRoutes.length === 0) return [];
  return routes.filter((r) => activeRoutes.some((ar) => cidrOverlap(r, ar)));
}

function cidrOverlap(a: string, b: string): boolean {
  const pa = parseCidr(a);
  const pb = parseCidr(b);
  if (!pa || !pb) return a === b;
  const minPrefix = Math.min(pa.prefix, pb.prefix);
  const mask = minPrefix === 0 ? 0 : (~0 << (32 - minPrefix)) >>> 0;
  return (pa.ip & mask) === (pb.ip & mask);
}

function parseCidr(cidr: string): { ip: number; prefix: number } | null {
  const parts = cidr.split("/");
  if (parts.length !== 2) return null;
  const prefix = parseInt(parts[1], 10);
  const octets = parts[0].split(".").map(Number);
  if (octets.length !== 4 || octets.some(isNaN)) return null;
  const ip = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  return { ip, prefix };
}

export function ConnectButton({
  connection,
  allConnections,
  onConnect,
  onDisconnect,
  onSwitch,
  onModeSwitch,
  connectingId,
  disconnectingId,
}: {
  connection: ConnectionWithStatus;
  allConnections?: ConnectionWithStatus[];
  onConnect: (id: string, mode: "full" | "split") => void;
  onDisconnect: (id: string) => void;
  onSwitch: (id: string) => void;
  onModeSwitch?: (id: string, mode: "full" | "split") => void;
  connectingId: string | null;
  disconnectingId: string | null;
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
  const activeConns = (allConnections ?? []).filter((c) => c.status === "connected" || c.status === "connecting");
  const hasFullActive = activeConns.some((c) => c.tunnel_mode === "full");
  const hasSplitRoutes = (connection.split_routes?.length ?? 0) > 0;

  // Full: блокирован если что-то активно
  const fullBlocked = activeConns.length > 0;
  const fullBlockedReason = fullBlocked ? "Есть активное подключение" : "";

  // Split: блокирован если full активен, нет подсетей, или пересечение
  const overlappingRoutes = hasSplitRoutes ? findOverlappingRoutes(connection.split_routes!, activeConns, connection.id) : [];
  const splitBlocked = !hasSplitRoutes || hasFullActive || overlappingRoutes.length > 0;
  const splitBlockedReason = !hasSplitRoutes
    ? "Укажите подсети в настройках"
    : hasFullActive
      ? "Активен полный туннель"
      : overlappingRoutes.length > 0
        ? `Пересечение: ${overlappingRoutes.join(", ")}`
        : "";

  return (
    <Box sx={{ display: "inline-flex", gap: 0.5 }}>
      <Tooltip title={splitBlockedReason || "Только корпоративные сети через VPN"}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="info"
            disabled={splitBlocked}
            onClick={() => onConnect(connection.id, "split")}
            sx={{ textTransform: "none", fontSize: 11, py: 0, px: 1, minWidth: 0 }}
          >
            Сплит
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={fullBlockedReason || "Весь трафик через VPN"}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="success"
            disabled={fullBlocked}
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
  allConnections,
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
}: {
  connection: ConnectionWithStatus;
  allConnections?: ConnectionWithStatus[];
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
        allConnections={allConnections}
        onConnect={onConnectWithMode ?? ((id, _mode) => onConnect(id))}
        onDisconnect={onDisconnect}
        onSwitch={onSwitch}
        onModeSwitch={onModeSwitch}
        connectingId={connectingId}
        disconnectingId={disconnectingId}
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
          disabled={busy || checking}
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
