import {
  Connection,
  ConnectionWithStatus,
} from "../../../typing/definitions.ts";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import { Delete, Edit, Info, NetworkCheck, PlayArrow, Stop } from "@mui/icons-material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../core/api";

export function ConnectButton({
  connection,
  onConnect,
  onDisconnect,
  connectingId,
  disconnectingId,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  connectingId: string | null;
  disconnectingId: string | null;
}) {
  if (connection.status === "connected") {
    return (
      <Tooltip title="Отключить">
        <IconButton
          size="small"
          color="error"
          onClick={() => onDisconnect(connection.id)}
          disabled={disconnectingId === connection.id}
          aria-label="Отключить"
        >
          {disconnectingId === connection.id ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <Stop fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Подключить">
      <span>
        <IconButton
          size="small"
          color="success"
          onClick={() => onConnect(connection.id)}
          disabled={
            connection.status === "connecting" ||
            connectingId === connection.id
          }
          aria-label="Подключить"
        >
          {connectingId === connection.id ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <PlayArrow fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function ActionButtons({
  connection,
  onConnect,
  onDisconnect,
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
