import {
  Connection,
  ConnectionWithStatus,
} from "../../../typing/definitions.ts";
import { IconButton, Tooltip } from "@mui/material";
import { Delete, Edit, Info, PlayArrow, Stop } from "@mui/icons-material";
import React from "react";
import toast from "react-hot-toast";

export function ConnectButton({
  connection,
  onConnect,
  onDisconnect,
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  if (connection.status === "connected") {
    return (
      <Tooltip title="Отключить">
        <IconButton
          size="small"
          color="error"
          onClick={() => onDisconnect(connection.id)}
        >
          <Stop fontSize="small" />
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
          disabled={connection.status === "connecting"}
        >
          <PlayArrow fontSize="small" />
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
}: {
  connection: ConnectionWithStatus;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
}) {
  const busy = ["connected", "connecting"].includes(connection.status);
  return (
    <>
      <ConnectButton
        connection={connection}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
      <Tooltip title="Редактировать">
        <span>
          <IconButton
            size="small"
            onClick={() => onEdit(connection)}
            disabled={busy}
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
          >
            <Delete fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={"Скопировать ID подключения"}>
        <span>
          <IconButton
            size="small"
            color="default"
            disabled={busy}
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
