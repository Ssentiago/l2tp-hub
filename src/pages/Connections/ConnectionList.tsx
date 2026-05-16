import React, {useState} from "react";
import {
    Box,
    TextField,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableSortLabel,
    Chip,
    IconButton,
    Tooltip,
    Typography,
    Paper,
    Card,
    CardContent,
    CardActions,
    ToggleButtonGroup,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from "@mui/material";
import {
    PlayArrow,
    Stop,
    Edit,
    Info,
    Delete,
    ViewList,
    GridView,
} from "@mui/icons-material";
import {
    ConnectionWithStatus,
    FilterState,
    SortDir,
    SortField,
    Connection,
    Label,
} from "../../typing/definitions";

// ─── utils ───────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
    connected: "success",
    connecting: "warning",
    disconnected: "default",
    unknown: "error",
};

const STATUS_LABEL: Record<string, string> = {
    connected: "Подключён",
    connecting: "Подключение...",
    disconnected: "Отключён",
    unknown: "Неизвестно",
};

function getDisplayName(c: Connection): string {
    return c.labels["company"] || c.name;
}

function isBusy(c: ConnectionWithStatus): boolean {
    return ["connected", "connecting"].includes(c.status);
}

// ─── shared props ─────────────────────────────────────────────────────────────

interface ConnectionItemProps {
    connection: ConnectionWithStatus;
    labels: Label[];
    onConnect: (id: string) => void;
    onDisconnect: (id: string) => void;
    onEdit: (c: Connection) => void;
    onDelete: (id: string) => void;
}

// ─── LabelChips ──────────────────────────────────────────────────────────────

function LabelChips({connection, labels}: { connection: Connection; labels: Label[] }) {
    const entries = Object.entries(connection.labels)
        .map(([id, value]) => ({
            key: labels.find((l) => l.id === id)?.name ?? id,
            value,
        }))
        .filter((e) => e.value);

    const visible = entries.slice(0, 2);
    const rest = entries.length - visible.length;

    return (
        <Box sx={{display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center"}}>
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
                    <span style={{color: "var(--mui-palette-text-secondary)"}}>{e.key}</span>
                    <span style={{opacity: 0.3}}>·</span>
                    <span style={{color: "var(--mui-palette-text-primary)", fontWeight: 500}}>{e.value}</span>
                </Box>
            ))}
            {rest > 0 && <Chip label={`+${rest}`} size="small" sx={{fontSize: 11}}/>}
        </Box>
    );
}

// ─── ConnectButton ────────────────────────────────────────────────────────────

function ConnectButton({
                           c,
                           onConnect,
                           onDisconnect,
                       }: {
    c: ConnectionWithStatus;
    onConnect: (id: string) => void;
    onDisconnect: (id: string) => void;
}) {
    if (c.status === "connected") {
        return (
            <Tooltip title="Отключить">
                <IconButton size="small" color="error" onClick={() => onDisconnect(c.id)}>
                    <Stop fontSize="small"/>
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
            onClick={() => onConnect(c.id)}
            disabled={c.status === "connecting"}
        >
          <PlayArrow fontSize="small"/>
        </IconButton>
      </span>
        </Tooltip>
    );
}

// ─── ActionButtons ────────────────────────────────────────────────────────────

function ActionButtons({c, onConnect, onDisconnect, onEdit, onDelete}: {
    c: ConnectionWithStatus;
    [get_connections] called
    [2026-05-06 22:48:25] [load] Starting to load store
    [2026-05-06 22:48:25] [store_path] Resolving application handle
    [2026-05-06 22:48:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:25] [load] Reading file content
    [2026-05-06 22:48:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:48:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [2026-05-06 22:48:25] [load] Starting to load store
    [2026-05-06 22:48:25] [store_path] Resolving application handle
    [2026-05-06 22:48:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:25] [load] Reading file content
    [2026-05-06 22:48:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:48:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [powershell] running: (Get-VpnConnection -Name 'dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:48:30] [load] Starting to load store
    [2026-05-06 22:48:30] [store_path] Resolving application handle
    [2026-05-06 22:48:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:30] [load] Reading file content
    [2026-05-06 22:48:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:48:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [2026-05-06 22:48:30] [load] Starting to load store
    [2026-05-06 22:48:30] [store_path] Resolving application handle
    [2026-05-06 22:48:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:30] [load] Reading file content
    [2026-05-06 22:48:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:48:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [powershell] running: (Get-VpnConnection -Name 'dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [delete_connection] (windows) called for id=dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [2026-05-06 22:48:34] [load] Starting to load store
    [2026-05-06 22:48:34] [store_path] Resolving application handle
    [2026-05-06 22:48:34] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:34] [load] Reading file content
    [2026-05-06 22:48:34] [load] File read successfully (578 bytes)
    [2026-05-06 22:48:34] [load] JSON parsed successfully. Connections count: 1
    [2026-05-06 22:48:34] [delete_password] Attempting to delete key: 'password_dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31'
    [2026-05-06 22:48:34] [delete_password] Key 'password_dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31' not found, nothing to delete (NoEntry)
    [2026-05-06 22:48:34] [delete_password] Attempting to delete key: 'shared_dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31'
    [2026-05-06 22:48:34] [delete_password] Key 'shared_dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31' not found, nothing to delete (NoEntry)
    [delete_vpn_service] name: dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31
    [powershell] running: Remove-VpnConnection -Name 'dd6aff1f-3dc6-46f5-9d74-2c0fef8aab31' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [2026-05-06 22:48:35] [save] Starting save process. Connections to save: 0
    [2026-05-06 22:48:35] [store_path] Resolving application handle
    [2026-05-06 22:48:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:35] [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [2026-05-06 22:48:35] [save] Serializing store to pretty JSON
    [2026-05-06 22:48:35] [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:35] [save] Store saved successfully
    [get_connections] called
    [2026-05-06 22:48:35] [load] Starting to load store
    [2026-05-06 22:48:35] [store_path] Resolving application handle
    [2026-05-06 22:48:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:35] [load] Reading file content
    [2026-05-06 22:48:35] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:35] [load] JSON parsed successfully. Connections count: 0
    [get_connections] called
    [2026-05-06 22:48:35] [load] Starting to load store
    [2026-05-06 22:48:35] [store_path] Resolving application handle
    [2026-05-06 22:48:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:35] [load] Reading file content
    [2026-05-06 22:48:35] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:35] [load] JSON parsed successfully. Connections count: 0
    [get_connections] called
    [2026-05-06 22:48:40] [load] Starting to load store
    [2026-05-06 22:48:40] [store_path] Resolving application handle
    [2026-05-06 22:48:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:40] [load] Reading file content
    [2026-05-06 22:48:40] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:40] [load] JSON parsed successfully. Connections count: 0
    [get_connections] called
    [2026-05-06 22:48:45] [load] Starting to load store
    [2026-05-06 22:48:45] [store_path] Resolving application handle
    [2026-05-06 22:48:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:45] [load] Reading file content
    [2026-05-06 22:48:45] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:45] [load] JSON parsed successfully. Connections count: 0
    [get_connections] called
    [2026-05-06 22:48:50] [load] Starting to load store
    [2026-05-06 22:48:50] [store_path] Resolving application handle
    [2026-05-06 22:48:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:50] [load] Reading file content
    [2026-05-06 22:48:50] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:50] [load] JSON parsed successfully. Connections count: 0
    [get_connections] called
    [2026-05-06 22:48:55] [load] Starting to load store
    [2026-05-06 22:48:55] [store_path] Resolving application handle
    [2026-05-06 22:48:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:55] [load] Reading file content
    [2026-05-06 22:48:55] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:55] [load] JSON parsed successfully. Connections count: 0
    [save_connection] called, id=None, name=, password_len=20, shared_len=20
    [2026-05-06 22:48:58] [load] Starting to load store
    [2026-05-06 22:48:58] [store_path] Resolving application handle
    [2026-05-06 22:48:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:58] [load] Reading file content
    [2026-05-06 22:48:58] [load] File read successfully (23 bytes)
    [2026-05-06 22:48:58] [load] JSON parsed successfully. Connections count: 0
    [save_connection] updating password in keychain for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:48:58] [set_password] Called for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'. Password length: 20
    [2026-05-06 22:48:58] [set_password] Successfully updated password for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [save_connection] updating shared_secret in keychain for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:48:58] [set_password] Called for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'. Password length: 20
    [2026-05-06 22:48:58] [set_password] Successfully updated password for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [save_connection] adding new connection id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:48:58] [save] Starting save process. Connections to save: 1
    [2026-05-06 22:48:58] [store_path] Resolving application handle
    [2026-05-06 22:48:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:58] [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [2026-05-06 22:48:58] [save] Serializing store to pretty JSON
    [2026-05-06 22:48:58] [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:58] [save] Store saved successfully
    [save_connection] success
    [get_connections] called
    [2026-05-06 22:48:58] [load] Starting to load store
    [2026-05-06 22:48:58] [store_path] Resolving application handle
    [2026-05-06 22:48:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:58] [load] Reading file content
    [2026-05-06 22:48:58] [load] File read successfully (564 bytes)
    [2026-05-06 22:48:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:48:58] [load] Starting to load store
    [2026-05-06 22:48:58] [store_path] Resolving application handle
    [2026-05-06 22:48:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:48:58] [load] Reading file content
    [2026-05-06 22:48:58] [load] File read successfully (564 bytes)
    [2026-05-06 22:48:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [get_connections] called
    [2026-05-06 22:49:00] [load] Starting to load store
    [2026-05-06 22:49:00] [store_path] Resolving application handle
    [2026-05-06 22:49:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:00] [load] Reading file content
    [2026-05-06 22:49:00] [load] File read successfully (564 bytes)
    [2026-05-06 22:49:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:00] [load] Starting to load store
    [2026-05-06 22:49:00] [store_path] Resolving application handle
    [2026-05-06 22:49:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:00] [load] Reading file content
    [2026-05-06 22:49:00] [load] File read successfully (564 bytes)
    [2026-05-06 22:49:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [connect_vpn] (windows) called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:03] [load] Starting to load store
    [2026-05-06 22:49:03] [store_path] Resolving application handle
    [2026-05-06 22:49:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:03] [load] Reading file content
    [2026-05-06 22:49:03] [load] File read successfully (564 bytes)
    [2026-05-06 22:49:03] [load] JSON parsed successfully. Connections count: 1
    [2026-05-06 22:49:03] [get_password] Attempting to retrieve key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:03] [get_password] Successfully retrieved password for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:03] [get_password] Attempting to retrieve key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:03] [get_password] Successfully retrieved password for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [connect_vpn] needs_recreate=true
    [connect_vpn] recreating service: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [create_vpn_service] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b, server: 87.249.5.138
    [delete_vpn_service] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: Remove-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"4e801a54-3e1b-4966-9a2d-f9481d884a1b" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"4e801a54-3e1b-4966-9a2d-f9481d884a1b" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [2026-05-06 22:49:05] [save] Starting save process. Connections to save: 1
    [2026-05-06 22:49:05] [store_path] Resolving application handle
    [2026-05-06 22:49:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:05] [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [2026-05-06 22:49:05] [save] Serializing store to pretty JSON
    [2026-05-06 22:49:05] [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:05] [save] Store saved successfully
    [connect_vpn] calling l2tp::connect_vpn for 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] stdout: ????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [get_connections] called
    [2026-05-06 22:49:08] [load] Starting to load store
    [2026-05-06 22:49:08] [store_path] Resolving application handle
    [2026-05-06 22:49:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:08] [load] Reading file content
    [2026-05-06 22:49:08] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:08] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 22:49:08] [load] Starting to load store
    [2026-05-06 22:49:08] [store_path] Resolving application handle
    [2026-05-06 22:49:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:08] [load] Reading file content
    [2026-05-06 22:49:08] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:08] [load] Starting to load store
    [2026-05-06 22:49:08] [store_path] Resolving application handle
    [2026-05-06 22:49:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:08] [load] Reading file content
    [2026-05-06 22:49:08] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:09] [load] Starting to load store
    [2026-05-06 22:49:09] [store_path] Resolving application handle
    [2026-05-06 22:49:09] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:09] [load] Reading file content
    [2026-05-06 22:49:09] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:09] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:11] [load] Starting to load store
    [2026-05-06 22:49:11] [store_path] Resolving application handle
    [2026-05-06 22:49:11] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:11] [load] Reading file content
    [2026-05-06 22:49:11] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:11] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:11] [load] Starting to load store
    [2026-05-06 22:49:11] [store_path] Resolving application handle
    [2026-05-06 22:49:11] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:11] [load] Reading file content
    [2026-05-06 22:49:11] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:11] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:15] [load] Starting to load store
    [2026-05-06 22:49:15] [store_path] Resolving application handle
    [2026-05-06 22:49:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:15] [load] Reading file content
    [2026-05-06 22:49:15] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:15] [load] Starting to load store
    [2026-05-06 22:49:15] [store_path] Resolving application handle
    [2026-05-06 22:49:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:15] [load] Reading file content
    [2026-05-06 22:49:15] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [disconnect_vpn] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:18] [load] Starting to load store
    [2026-05-06 22:49:18] [store_path] Resolving application handle
    [2026-05-06 22:49:18] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:18] [load] Reading file content
    [2026-05-06 22:49:18] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:18] [load] JSON parsed successfully. Connections count: 1
    [disconnect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: rasdial '4e801a54-3e1b-4966-9a2d-f9481d884a1b' /disconnect
    [powershell] stdout: Command completed successfully.

    stderr:
        status: exit code: 0
    [disconnect_vpn] finished
    [get_connections] called
    [2026-05-06 22:49:19] [load] Starting to load store
    [2026-05-06 22:49:19] [store_path] Resolving application handle
    [2026-05-06 22:49:19] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:19] [load] Reading file content
    [2026-05-06 22:49:19] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:19] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:19] [load] Starting to load store
    [2026-05-06 22:49:19] [store_path] Resolving application handle
    [2026-05-06 22:49:19] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:19] [load] Reading file content
    [2026-05-06 22:49:19] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:19] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:49:20] [load] Starting to load store
    [2026-05-06 22:49:20] [store_path] Resolving application handle
    [2026-05-06 22:49:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:20] [load] Reading file content
    [2026-05-06 22:49:20] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:20] [load] Starting to load store
    [2026-05-06 22:49:20] [store_path] Resolving application handle
    [2026-05-06 22:49:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:20] [load] Reading file content
    [2026-05-06 22:49:20] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] (windows) called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:22] [load] Starting to load store
    [2026-05-06 22:49:22] [store_path] Resolving application handle
    [2026-05-06 22:49:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:22] [load] Reading file content
    [2026-05-06 22:49:22] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:22] [load] JSON parsed successfully. Connections count: 1
    [2026-05-06 22:49:22] [get_password] Attempting to retrieve key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:22] [get_password] Successfully retrieved password for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:22] [get_password] Attempting to retrieve key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:22] [get_password] Successfully retrieved password for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [connect_vpn] needs_recreate=false
    [connect_vpn] calling l2tp::connect_vpn for 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] stdout: ????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [get_connections] called
    [2026-05-06 22:49:23] [load] Starting to load store
    [2026-05-06 22:49:23] [store_path] Resolving application handle
    [2026-05-06 22:49:23] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:23] [load] Reading file content
    [2026-05-06 22:49:23] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:23] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:23] [load] Starting to load store
    [2026-05-06 22:49:23] [store_path] Resolving application handle
    [2026-05-06 22:49:23] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:23] [load] Reading file content
    [2026-05-06 22:49:23] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:23] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:25] [load] Starting to load store
    [2026-05-06 22:49:25] [store_path] Resolving application handle
    [2026-05-06 22:49:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:25] [load] Reading file content
    [2026-05-06 22:49:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:25] [load] Starting to load store
    [2026-05-06 22:49:25] [store_path] Resolving application handle
    [2026-05-06 22:49:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:25] [load] Reading file content
    [2026-05-06 22:49:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [disconnect_vpn] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:26] [load] Starting to load store
    [2026-05-06 22:49:26] [store_path] Resolving application handle
    [2026-05-06 22:49:26] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:26] [load] Reading file content
    [2026-05-06 22:49:26] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:26] [load] JSON parsed successfully. Connections count: 1
    [disconnect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: rasdial '4e801a54-3e1b-4966-9a2d-f9481d884a1b' /disconnect
    [powershell] stdout: Command completed successfully.

    stderr:
        status: exit code: 0
    [disconnect_vpn] finished
    [get_connections] called
    [2026-05-06 22:49:26] [load] Starting to load store
    [2026-05-06 22:49:26] [store_path] Resolving application handle
    [2026-05-06 22:49:26] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:26] [load] Reading file content
    [2026-05-06 22:49:26] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:26] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:26] [load] Starting to load store
    [2026-05-06 22:49:26] [store_path] Resolving application handle
    [2026-05-06 22:49:26] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:26] [load] Reading file content
    [2026-05-06 22:49:26] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:26] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] (windows) called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:28] [load] Starting to load store
    [2026-05-06 22:49:28] [store_path] Resolving application handle
    [2026-05-06 22:49:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:28] [load] Reading file content
    [2026-05-06 22:49:28] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:28] [load] JSON parsed successfully. Connections count: 1
    [2026-05-06 22:49:28] [get_password] Attempting to retrieve key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:28] [get_password] Successfully retrieved password for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:28] [get_password] Attempting to retrieve key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:49:28] [get_password] Successfully retrieved password for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [connect_vpn] needs_recreate=false
    [connect_vpn] calling l2tp::connect_vpn for 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] stdout: ????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [get_connections] called
    [2026-05-06 22:49:29] [load] Starting to load store
    [2026-05-06 22:49:29] [store_path] Resolving application handle
    [2026-05-06 22:49:29] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:29] [load] Reading file content
    [2026-05-06 22:49:29] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:29] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:29] [load] Starting to load store
    [2026-05-06 22:49:29] [store_path] Resolving application handle
    [2026-05-06 22:49:29] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:29] [load] Reading file content
    [2026-05-06 22:49:29] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:29] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:30] [load] Starting to load store
    [2026-05-06 22:49:30] [store_path] Resolving application handle
    [2026-05-06 22:49:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:30] [load] Reading file content
    [2026-05-06 22:49:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:30] [load] Starting to load store
    [2026-05-06 22:49:30] [store_path] Resolving application handle
    [2026-05-06 22:49:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:30] [load] Reading file content
    [2026-05-06 22:49:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:35] [load] Starting to load store
    [2026-05-06 22:49:35] [store_path] Resolving application handle
    [2026-05-06 22:49:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:35] [load] Reading file content
    [2026-05-06 22:49:35] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:35] [load] Starting to load store
    [2026-05-06 22:49:35] [store_path] Resolving application handle
    [2026-05-06 22:49:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:35] [load] Reading file content
    [2026-05-06 22:49:35] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:40] [load] Starting to load store
    [2026-05-06 22:49:40] [store_path] Resolving application handle
    [2026-05-06 22:49:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:40] [load] Reading file content
    [2026-05-06 22:49:40] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:40] [load] Starting to load store
    [2026-05-06 22:49:40] [store_path] Resolving application handle
    [2026-05-06 22:49:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:40] [load] Reading file content
    [2026-05-06 22:49:40] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:49:45] [load] Starting to load store
    [2026-05-06 22:49:45] [store_path] Resolving application handle
    [2026-05-06 22:49:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:45] [load] Reading file content
    [2026-05-06 22:49:45] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:45] [load] Starting to load store
    [2026-05-06 22:49:45] [store_path] Resolving application handle
    [2026-05-06 22:49:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:45] [load] Reading file content
    [2026-05-06 22:49:45] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [disconnect_vpn] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:48] [load] Starting to load store
    [2026-05-06 22:49:48] [store_path] Resolving application handle
    [2026-05-06 22:49:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:48] [load] Reading file content
    [2026-05-06 22:49:48] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:48] [load] JSON parsed successfully. Connections count: 1
    [disconnect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: rasdial '4e801a54-3e1b-4966-9a2d-f9481d884a1b' /disconnect
    [powershell] stdout: Command completed successfully.

    stderr:
        status: exit code: 0
    [disconnect_vpn] finished
    [get_connections] called
    [2026-05-06 22:49:48] [load] Starting to load store
    [2026-05-06 22:49:48] [store_path] Resolving application handle
    [2026-05-06 22:49:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:48] [load] Reading file content
    [2026-05-06 22:49:48] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:48] [load] Starting to load store
    [2026-05-06 22:49:48] [store_path] Resolving application handle
    [2026-05-06 22:49:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:48] [load] Reading file content
    [2026-05-06 22:49:48] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:49:50] [load] Starting to load store
    [2026-05-06 22:49:50] [store_path] Resolving application handle
    [2026-05-06 22:49:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:50] [load] Reading file content
    [2026-05-06 22:49:50] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:50] [load] Starting to load store
    [2026-05-06 22:49:50] [store_path] Resolving application handle
    [2026-05-06 22:49:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:50] [load] Reading file content
    [2026-05-06 22:49:50] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:49:55] [load] Starting to load store
    [2026-05-06 22:49:55] [store_path] Resolving application handle
    [2026-05-06 22:49:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:55] [load] Reading file content
    [2026-05-06 22:49:55] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:49:55] [load] Starting to load store
    [2026-05-06 22:49:55] [store_path] Resolving application handle
    [2026-05-06 22:49:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:49:55] [load] Reading file content
    [2026-05-06 22:49:55] [load] File read successfully (578 bytes)
    [2026-05-06 22:49:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:00] [load] Starting to load store
    [2026-05-06 22:50:00] [store_path] Resolving application handle
    [2026-05-06 22:50:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:00] [load] Reading file content
    [2026-05-06 22:50:00] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:00] [load] Starting to load store
    [2026-05-06 22:50:00] [store_path] Resolving application handle
    [2026-05-06 22:50:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:00] [load] Reading file content
    [2026-05-06 22:50:00] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:05] [load] Starting to load store
    [2026-05-06 22:50:05] [store_path] Resolving application handle
    [2026-05-06 22:50:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:05] [load] Reading file content
    [2026-05-06 22:50:05] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:05] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:05] [load] Starting to load store
    [2026-05-06 22:50:05] [store_path] Resolving application handle
    [2026-05-06 22:50:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:05] [load] Reading file content
    [2026-05-06 22:50:05] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:05] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:10] [load] Starting to load store
    [2026-05-06 22:50:10] [store_path] Resolving application handle
    [2026-05-06 22:50:10] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:10] [load] Reading file content
    [2026-05-06 22:50:10] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:10] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:10] [load] Starting to load store
    [2026-05-06 22:50:10] [store_path] Resolving application handle
    [2026-05-06 22:50:10] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:10] [load] Reading file content
    [2026-05-06 22:50:10] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:10] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:15] [load] Starting to load store
    [2026-05-06 22:50:15] [store_path] Resolving application handle
    [2026-05-06 22:50:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:15] [load] Reading file content
    [2026-05-06 22:50:15] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:15] [load] Starting to load store
    [2026-05-06 22:50:15] [store_path] Resolving application handle
    [2026-05-06 22:50:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:15] [load] Reading file content
    [2026-05-06 22:50:15] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:20] [load] Starting to load store
    [2026-05-06 22:50:20] [store_path] Resolving application handle
    [2026-05-06 22:50:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:20] [load] Reading file content
    [2026-05-06 22:50:20] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:20] [load] Starting to load store
    [2026-05-06 22:50:20] [store_path] Resolving application handle
    [2026-05-06 22:50:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:20] [load] Reading file content
    [2026-05-06 22:50:20] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:25] [load] Starting to load store
    [2026-05-06 22:50:25] [store_path] Resolving application handle
    [2026-05-06 22:50:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:25] [load] Reading file content
    [2026-05-06 22:50:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:25] [load] Starting to load store
    [2026-05-06 22:50:25] [store_path] Resolving application handle
    [2026-05-06 22:50:25] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:25] [load] Reading file content
    [2026-05-06 22:50:25] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:25] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:30] [load] Starting to load store
    [2026-05-06 22:50:30] [store_path] Resolving application handle
    [2026-05-06 22:50:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:30] [load] Reading file content
    [2026-05-06 22:50:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:30] [load] Starting to load store
    [2026-05-06 22:50:30] [store_path] Resolving application handle
    [2026-05-06 22:50:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:30] [load] Reading file content
    [2026-05-06 22:50:30] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] (windows) called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:34] [load] Starting to load store
    [2026-05-06 22:50:34] [store_path] Resolving application handle
    [2026-05-06 22:50:34] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:34] [load] Reading file content
    [2026-05-06 22:50:34] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:34] [load] JSON parsed successfully. Connections count: 1
    [2026-05-06 22:50:34] [get_password] Attempting to retrieve key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:50:34] [get_password] Successfully retrieved password for key: 'password_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:50:34] [get_password] Attempting to retrieve key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [2026-05-06 22:50:34] [get_password] Successfully retrieved password for key: 'shared_4e801a54-3e1b-4966-9a2d-f9481d884a1b'
    [connect_vpn] needs_recreate=false
    [connect_vpn] calling l2tp::connect_vpn for 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [connect_vpn] stdout: ????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 4e801a54-3e1b-4966-9a2d-f9481d884a1b.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [get_connections] called
    [2026-05-06 22:50:35] [load] Starting to load store
    [2026-05-06 22:50:35] [store_path] Resolving application handle
    [2026-05-06 22:50:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:35] [load] Reading file content
    [2026-05-06 22:50:35] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:35] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 22:50:35] [load] Starting to load store
    [2026-05-06 22:50:35] [store_path] Resolving application handle
    [2026-05-06 22:50:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:35] [load] Reading file content
    [2026-05-06 22:50:35] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:35] [load] Starting to load store
    [2026-05-06 22:50:35] [store_path] Resolving application handle
    [2026-05-06 22:50:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:35] [load] Reading file content
    [2026-05-06 22:50:35] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:36] [load] Starting to load store
    [2026-05-06 22:50:36] [store_path] Resolving application handle
    [2026-05-06 22:50:36] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:36] [load] Reading file content
    [2026-05-06 22:50:36] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:36] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:50:40] [load] Starting to load store
    [2026-05-06 22:50:40] [store_path] Resolving application handle
    [2026-05-06 22:50:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:40] [load] Reading file content
    [2026-05-06 22:50:40] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:40] [load] Starting to load store
    [2026-05-06 22:50:40] [store_path] Resolving application handle
    [2026-05-06 22:50:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:40] [load] Reading file content
    [2026-05-06 22:50:40] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [get_connections] called
    [2026-05-06 22:50:45] [load] Starting to load store
    [2026-05-06 22:50:45] [store_path] Resolving application handle
    [2026-05-06 22:50:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:45] [load] Reading file content
    [2026-05-06 22:50:45] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:45] [load] Starting to load store
    [2026-05-06 22:50:45] [store_path] Resolving application handle
    [2026-05-06 22:50:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:45] [load] Reading file content
    [2026-05-06 22:50:45] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [disconnect_vpn] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:46] [load] Starting to load store
    [2026-05-06 22:50:46] [store_path] Resolving application handle
    [2026-05-06 22:50:46] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:46] [load] Reading file content
    [2026-05-06 22:50:46] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:46] [load] JSON parsed successfully. Connections count: 1
    [disconnect_vpn] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: rasdial '4e801a54-3e1b-4966-9a2d-f9481d884a1b' /disconnect
    [powershell] stdout: Command completed successfully.

    stderr:
        status: exit code: 0
    [disconnect_vpn] finished
    [get_connections] called
    [2026-05-06 22:50:47] [load] Starting to load store
    [2026-05-06 22:50:47] [store_path] Resolving application handle
    [2026-05-06 22:50:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:47] [load] Reading file content
    [2026-05-06 22:50:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:47] [load] Starting to load store
    [2026-05-06 22:50:47] [store_path] Resolving application handle
    [2026-05-06 22:50:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:47] [load] Reading file content
    [2026-05-06 22:50:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:50] [load] Starting to load store
    [2026-05-06 22:50:50] [store_path] Resolving application handle
    [2026-05-06 22:50:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:50] [load] Reading file content
    [2026-05-06 22:50:50] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:50] [load] Starting to load store
    [2026-05-06 22:50:50] [store_path] Resolving application handle
    [2026-05-06 22:50:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:50] [load] Reading file content
    [2026-05-06 22:50:50] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:50:55] [load] Starting to load store
    [2026-05-06 22:50:55] [store_path] Resolving application handle
    [2026-05-06 22:50:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:55] [load] Reading file content
    [2026-05-06 22:50:55] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:50:55] [load] Starting to load store
    [2026-05-06 22:50:55] [store_path] Resolving application handle
    [2026-05-06 22:50:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:50:55] [load] Reading file content
    [2026-05-06 22:50:55] [load] File read successfully (578 bytes)
    [2026-05-06 22:50:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:51:00] [load] Starting to load store
    [2026-05-06 22:51:00] [store_path] Resolving application handle
    [2026-05-06 22:51:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:51:00] [load] Reading file content
    [2026-05-06 22:51:00] [load] File read successfully (578 bytes)
    [2026-05-06 22:51:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:51:00] [load] Starting to load store
    [2026-05-06 22:51:00] [store_path] Resolving application handle
    [2026-05-06 22:51:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:51:00] [load] Reading file content
    [2026-05-06 22:51:00] [load] File read successfully (578 bytes)
    [2026-05-06 22:51:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:27] [load] Starting to load store
    [2026-05-06 22:57:27] [store_path] Resolving application handle
    [2026-05-06 22:57:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:27] [load] Reading file content
    [2026-05-06 22:57:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:27] [load] Starting to load store
    [2026-05-06 22:57:27] [store_path] Resolving application handle
    [2026-05-06 22:57:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:27] [load] Reading file content
    [2026-05-06 22:57:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:32] [load] Starting to load store
    [2026-05-06 22:57:32] [store_path] Resolving application handle
    [2026-05-06 22:57:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:32] [load] Reading file content
    [2026-05-06 22:57:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:32] [load] Starting to load store
    [2026-05-06 22:57:32] [store_path] Resolving application handle
    [2026-05-06 22:57:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:32] [load] Reading file content
    [2026-05-06 22:57:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:37] [load] Starting to load store
    [2026-05-06 22:57:37] [store_path] Resolving application handle
    [2026-05-06 22:57:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:37] [load] Reading file content
    [2026-05-06 22:57:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:37] [load] Starting to load store
    [2026-05-06 22:57:37] [store_path] Resolving application handle
    [2026-05-06 22:57:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:37] [load] Reading file content
    [2026-05-06 22:57:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:42] [load] Starting to load store
    [2026-05-06 22:57:42] [store_path] Resolving application handle
    [2026-05-06 22:57:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:42] [load] Reading file content
    [2026-05-06 22:57:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:42] [load] Starting to load store
    [2026-05-06 22:57:42] [store_path] Resolving application handle
    [2026-05-06 22:57:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:42] [load] Reading file content
    [2026-05-06 22:57:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:47] [load] Starting to load store
    [2026-05-06 22:57:47] [store_path] Resolving application handle
    [2026-05-06 22:57:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:47] [load] Reading file content
    [2026-05-06 22:57:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:47] [load] Starting to load store
    [2026-05-06 22:57:47] [store_path] Resolving application handle
    [2026-05-06 22:57:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:47] [load] Reading file content
    [2026-05-06 22:57:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:52] [load] Starting to load store
    [2026-05-06 22:57:52] [store_path] Resolving application handle
    [2026-05-06 22:57:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:52] [load] Reading file content
    [2026-05-06 22:57:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:52] [load] Starting to load store
    [2026-05-06 22:57:52] [store_path] Resolving application handle
    [2026-05-06 22:57:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:52] [load] Reading file content
    [2026-05-06 22:57:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:57:57] [load] Starting to load store
    [2026-05-06 22:57:57] [store_path] Resolving application handle
    [2026-05-06 22:57:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:57] [load] Reading file content
    [2026-05-06 22:57:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:57:57] [load] Starting to load store
    [2026-05-06 22:57:57] [store_path] Resolving application handle
    [2026-05-06 22:57:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:57:57] [load] Reading file content
    [2026-05-06 22:57:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:57:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:02] [load] Starting to load store
    [2026-05-06 22:58:02] [store_path] Resolving application handle
    [2026-05-06 22:58:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:02] [load] Reading file content
    [2026-05-06 22:58:02] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:02] [load] Starting to load store
    [2026-05-06 22:58:02] [store_path] Resolving application handle
    [2026-05-06 22:58:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:02] [load] Reading file content
    [2026-05-06 22:58:02] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:07] [load] Starting to load store
    [2026-05-06 22:58:07] [store_path] Resolving application handle
    [2026-05-06 22:58:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:07] [load] Reading file content
    [2026-05-06 22:58:07] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:07] [load] Starting to load store
    [2026-05-06 22:58:07] [store_path] Resolving application handle
    [2026-05-06 22:58:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:07] [load] Reading file content
    [2026-05-06 22:58:07] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:12] [load] Starting to load store
    [2026-05-06 22:58:12] [store_path] Resolving application handle
    [2026-05-06 22:58:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:12] [load] Reading file content
    [2026-05-06 22:58:12] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:12] [load] Starting to load store
    [2026-05-06 22:58:12] [store_path] Resolving application handle
    [2026-05-06 22:58:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:12] [load] Reading file content
    [2026-05-06 22:58:12] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:17] [load] Starting to load store
    [2026-05-06 22:58:17] [store_path] Resolving application handle
    [2026-05-06 22:58:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:17] [load] Reading file content
    [2026-05-06 22:58:17] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:17] [load] Starting to load store
    [2026-05-06 22:58:17] [store_path] Resolving application handle
    [2026-05-06 22:58:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:17] [load] Reading file content
    [2026-05-06 22:58:17] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:22] [load] Starting to load store
    [2026-05-06 22:58:22] [store_path] Resolving application handle
    [2026-05-06 22:58:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:22] [load] Reading file content
    [2026-05-06 22:58:22] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:22] [load] Starting to load store
    [2026-05-06 22:58:22] [store_path] Resolving application handle
    [2026-05-06 22:58:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:22] [load] Reading file content
    [2026-05-06 22:58:22] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:27] [load] Starting to load store
    [2026-05-06 22:58:27] [store_path] Resolving application handle
    [2026-05-06 22:58:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:27] [load] Reading file content
    [2026-05-06 22:58:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:27] [load] Starting to load store
    [2026-05-06 22:58:27] [store_path] Resolving application handle
    [2026-05-06 22:58:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:27] [load] Reading file content
    [2026-05-06 22:58:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:32] [load] Starting to load store
    [2026-05-06 22:58:32] [store_path] Resolving application handle
    [2026-05-06 22:58:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:32] [load] Reading file content
    [2026-05-06 22:58:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:32] [load] Starting to load store
    [2026-05-06 22:58:32] [store_path] Resolving application handle
    [2026-05-06 22:58:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:32] [load] Reading file content
    [2026-05-06 22:58:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:37] [load] Starting to load store
    [2026-05-06 22:58:37] [store_path] Resolving application handle
    [2026-05-06 22:58:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:37] [load] Reading file content
    [2026-05-06 22:58:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:37] [load] Starting to load store
    [2026-05-06 22:58:37] [store_path] Resolving application handle
    [2026-05-06 22:58:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:37] [load] Reading file content
    [2026-05-06 22:58:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:42] [load] Starting to load store
    [2026-05-06 22:58:42] [store_path] Resolving application handle
    [2026-05-06 22:58:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:42] [load] Reading file content
    [2026-05-06 22:58:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:42] [load] Starting to load store
    [2026-05-06 22:58:42] [store_path] Resolving application handle
    [2026-05-06 22:58:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:42] [load] Reading file content
    [2026-05-06 22:58:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:47] [load] Starting to load store
    [2026-05-06 22:58:47] [store_path] Resolving application handle
    [2026-05-06 22:58:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:47] [load] Reading file content
    [2026-05-06 22:58:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:47] [load] Starting to load store
    [2026-05-06 22:58:47] [store_path] Resolving application handle
    [2026-05-06 22:58:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:47] [load] Reading file content
    [2026-05-06 22:58:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:52] [load] Starting to load store
    [2026-05-06 22:58:52] [store_path] Resolving application handle
    [2026-05-06 22:58:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:52] [load] Reading file content
    [2026-05-06 22:58:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:52] [load] Starting to load store
    [2026-05-06 22:58:52] [store_path] Resolving application handle
    [2026-05-06 22:58:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:52] [load] Reading file content
    [2026-05-06 22:58:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:58:57] [load] Starting to load store
    [2026-05-06 22:58:57] [store_path] Resolving application handle
    [2026-05-06 22:58:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:57] [load] Reading file content
    [2026-05-06 22:58:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:58:57] [load] Starting to load store
    [2026-05-06 22:58:57] [store_path] Resolving application handle
    [2026-05-06 22:58:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:58:57] [load] Reading file content
    [2026-05-06 22:58:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:58:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:02] [load] Starting to load store
    [2026-05-06 22:59:02] [store_path] Resolving application handle
    [2026-05-06 22:59:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:02] [load] Reading file content
    [2026-05-06 22:59:02] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:02] [load] Starting to load store
    [2026-05-06 22:59:02] [store_path] Resolving application handle
    [2026-05-06 22:59:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:02] [load] Reading file content
    [2026-05-06 22:59:02] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:07] [load] Starting to load store
    [2026-05-06 22:59:07] [store_path] Resolving application handle
    [2026-05-06 22:59:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:07] [load] Reading file content
    [2026-05-06 22:59:07] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:07] [load] Starting to load store
    [2026-05-06 22:59:07] [store_path] Resolving application handle
    [2026-05-06 22:59:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:07] [load] Reading file content
    [2026-05-06 22:59:07] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:12] [load] Starting to load store
    [2026-05-06 22:59:12] [store_path] Resolving application handle
    [2026-05-06 22:59:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:12] [load] Reading file content
    [2026-05-06 22:59:12] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:12] [load] Starting to load store
    [2026-05-06 22:59:12] [store_path] Resolving application handle
    [2026-05-06 22:59:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:12] [load] Reading file content
    [2026-05-06 22:59:12] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:17] [load] Starting to load store
    [2026-05-06 22:59:17] [store_path] Resolving application handle
    [2026-05-06 22:59:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:17] [load] Reading file content
    [2026-05-06 22:59:17] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:17] [load] Starting to load store
    [2026-05-06 22:59:17] [store_path] Resolving application handle
    [2026-05-06 22:59:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:17] [load] Reading file content
    [2026-05-06 22:59:17] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:22] [load] Starting to load store
    [2026-05-06 22:59:22] [store_path] Resolving application handle
    [2026-05-06 22:59:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:22] [load] Reading file content
    [2026-05-06 22:59:22] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:22] [load] Starting to load store
    [2026-05-06 22:59:22] [store_path] Resolving application handle
    [2026-05-06 22:59:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:22] [load] Reading file content
    [2026-05-06 22:59:22] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:27] [load] Starting to load store
    [2026-05-06 22:59:27] [store_path] Resolving application handle
    [2026-05-06 22:59:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:27] [load] Reading file content
    [2026-05-06 22:59:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:27] [load] Starting to load store
    [2026-05-06 22:59:27] [store_path] Resolving application handle
    [2026-05-06 22:59:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:27] [load] Reading file content
    [2026-05-06 22:59:27] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:32] [load] Starting to load store
    [2026-05-06 22:59:32] [store_path] Resolving application handle
    [2026-05-06 22:59:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:32] [load] Reading file content
    [2026-05-06 22:59:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:32] [load] Starting to load store
    [2026-05-06 22:59:32] [store_path] Resolving application handle
    [2026-05-06 22:59:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:32] [load] Reading file content
    [2026-05-06 22:59:32] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:37] [load] Starting to load store
    [2026-05-06 22:59:37] [store_path] Resolving application handle
    [2026-05-06 22:59:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:37] [load] Reading file content
    [2026-05-06 22:59:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:37] [load] Starting to load store
    [2026-05-06 22:59:37] [store_path] Resolving application handle
    [2026-05-06 22:59:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:37] [load] Reading file content
    [2026-05-06 22:59:37] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:42] [load] Starting to load store
    [2026-05-06 22:59:42] [store_path] Resolving application handle
    [2026-05-06 22:59:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:42] [load] Reading file content
    [2026-05-06 22:59:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:42] [load] Starting to load store
    [2026-05-06 22:59:42] [store_path] Resolving application handle
    [2026-05-06 22:59:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:42] [load] Reading file content
    [2026-05-06 22:59:42] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:47] [load] Starting to load store
    [2026-05-06 22:59:47] [store_path] Resolving application handle
    [2026-05-06 22:59:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:47] [load] Reading file content
    [2026-05-06 22:59:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:47] [load] Starting to load store
    [2026-05-06 22:59:47] [store_path] Resolving application handle
    [2026-05-06 22:59:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:47] [load] Reading file content
    [2026-05-06 22:59:47] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:52] [load] Starting to load store
    [2026-05-06 22:59:52] [store_path] Resolving application handle
    [2026-05-06 22:59:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:52] [load] Reading file content
    [2026-05-06 22:59:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:52] [load] Starting to load store
    [2026-05-06 22:59:52] [store_path] Resolving application handle
    [2026-05-06 22:59:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:52] [load] Reading file content
    [2026-05-06 22:59:52] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 22:59:57] [load] Starting to load store
    [2026-05-06 22:59:57] [store_path] Resolving application handle
    [2026-05-06 22:59:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:57] [load] Reading file content
    [2026-05-06 22:59:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 22:59:57] [load] Starting to load store
    [2026-05-06 22:59:57] [store_path] Resolving application handle
    [2026-05-06 22:59:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 22:59:57] [load] Reading file content
    [2026-05-06 22:59:57] [load] File read successfully (578 bytes)
    [2026-05-06 22:59:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:02] [load] Starting to load store
    [2026-05-06 23:00:02] [store_path] Resolving application handle
    [2026-05-06 23:00:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:02] [load] Reading file content
    [2026-05-06 23:00:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:02] [load] Starting to load store
    [2026-05-06 23:00:02] [store_path] Resolving application handle
    [2026-05-06 23:00:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:02] [load] Reading file content
    [2026-05-06 23:00:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:07] [load] Starting to load store
    [2026-05-06 23:00:07] [store_path] Resolving application handle
    [2026-05-06 23:00:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:07] [load] Reading file content
    [2026-05-06 23:00:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:07] [load] Starting to load store
    [2026-05-06 23:00:07] [store_path] Resolving application handle
    [2026-05-06 23:00:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:07] [load] Reading file content
    [2026-05-06 23:00:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:12] [load] Starting to load store
    [2026-05-06 23:00:12] [store_path] Resolving application handle
    [2026-05-06 23:00:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:12] [load] Reading file content
    [2026-05-06 23:00:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:12] [load] Starting to load store
    [2026-05-06 23:00:12] [store_path] Resolving application handle
    [2026-05-06 23:00:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:12] [load] Reading file content
    [2026-05-06 23:00:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:17] [load] Starting to load store
    [2026-05-06 23:00:17] [store_path] Resolving application handle
    [2026-05-06 23:00:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:17] [load] Reading file content
    [2026-05-06 23:00:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:17] [load] Starting to load store
    [2026-05-06 23:00:17] [store_path] Resolving application handle
    [2026-05-06 23:00:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:17] [load] Reading file content
    [2026-05-06 23:00:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:22] [load] Starting to load store
    [2026-05-06 23:00:22] [store_path] Resolving application handle
    [2026-05-06 23:00:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:22] [load] Reading file content
    [2026-05-06 23:00:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:22] [load] Starting to load store
    [2026-05-06 23:00:22] [store_path] Resolving application handle
    [2026-05-06 23:00:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:22] [load] Reading file content
    [2026-05-06 23:00:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:27] [load] Starting to load store
    [2026-05-06 23:00:27] [store_path] Resolving application handle
    [2026-05-06 23:00:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:27] [load] Reading file content
    [2026-05-06 23:00:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:27] [load] Starting to load store
    [2026-05-06 23:00:27] [store_path] Resolving application handle
    [2026-05-06 23:00:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:27] [load] Reading file content
    [2026-05-06 23:00:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:32] [load] Starting to load store
    [2026-05-06 23:00:32] [store_path] Resolving application handle
    [2026-05-06 23:00:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:32] [load] Reading file content
    [2026-05-06 23:00:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:32] [load] Starting to load store
    [2026-05-06 23:00:32] [store_path] Resolving application handle
    [2026-05-06 23:00:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:32] [load] Reading file content
    [2026-05-06 23:00:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:37] [load] Starting to load store
    [2026-05-06 23:00:37] [store_path] Resolving application handle
    [2026-05-06 23:00:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:37] [load] Reading file content
    [2026-05-06 23:00:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:37] [load] Starting to load store
    [2026-05-06 23:00:37] [store_path] Resolving application handle
    [2026-05-06 23:00:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:37] [load] Reading file content
    [2026-05-06 23:00:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:42] [load] Starting to load store
    [2026-05-06 23:00:42] [store_path] Resolving application handle
    [2026-05-06 23:00:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:42] [load] Reading file content
    [2026-05-06 23:00:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:42] [load] Starting to load store
    [2026-05-06 23:00:42] [store_path] Resolving application handle
    [2026-05-06 23:00:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:42] [load] Reading file content
    [2026-05-06 23:00:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:47] [load] Starting to load store
    [2026-05-06 23:00:47] [store_path] Resolving application handle
    [2026-05-06 23:00:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:47] [load] Reading file content
    [2026-05-06 23:00:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:47] [load] Starting to load store
    [2026-05-06 23:00:47] [store_path] Resolving application handle
    [2026-05-06 23:00:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:47] [load] Reading file content
    [2026-05-06 23:00:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:52] [load] Starting to load store
    [2026-05-06 23:00:52] [store_path] Resolving application handle
    [2026-05-06 23:00:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:52] [load] Reading file content
    [2026-05-06 23:00:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:52] [load] Starting to load store
    [2026-05-06 23:00:52] [store_path] Resolving application handle
    [2026-05-06 23:00:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:52] [load] Reading file content
    [2026-05-06 23:00:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:00:57] [load] Starting to load store
    [2026-05-06 23:00:57] [store_path] Resolving application handle
    [2026-05-06 23:00:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:57] [load] Reading file content
    [2026-05-06 23:00:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:00:57] [load] Starting to load store
    [2026-05-06 23:00:57] [store_path] Resolving application handle
    [2026-05-06 23:00:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:00:57] [load] Reading file content
    [2026-05-06 23:00:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:00:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:02] [load] Starting to load store
    [2026-05-06 23:01:02] [store_path] Resolving application handle
    [2026-05-06 23:01:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:02] [load] Reading file content
    [2026-05-06 23:01:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:02] [load] Starting to load store
    [2026-05-06 23:01:02] [store_path] Resolving application handle
    [2026-05-06 23:01:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:02] [load] Reading file content
    [2026-05-06 23:01:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:07] [load] Starting to load store
    [2026-05-06 23:01:07] [store_path] Resolving application handle
    [2026-05-06 23:01:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:07] [load] Reading file content
    [2026-05-06 23:01:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:07] [load] Starting to load store
    [2026-05-06 23:01:07] [store_path] Resolving application handle
    [2026-05-06 23:01:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:07] [load] Reading file content
    [2026-05-06 23:01:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:12] [load] Starting to load store
    [2026-05-06 23:01:12] [store_path] Resolving application handle
    [2026-05-06 23:01:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:12] [load] Reading file content
    [2026-05-06 23:01:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:12] [load] Starting to load store
    [2026-05-06 23:01:12] [store_path] Resolving application handle
    [2026-05-06 23:01:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:12] [load] Reading file content
    [2026-05-06 23:01:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:17] [load] Starting to load store
    [2026-05-06 23:01:17] [store_path] Resolving application handle
    [2026-05-06 23:01:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:17] [load] Reading file content
    [2026-05-06 23:01:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:17] [load] Starting to load store
    [2026-05-06 23:01:17] [store_path] Resolving application handle
    [2026-05-06 23:01:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:17] [load] Reading file content
    [2026-05-06 23:01:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:22] [load] Starting to load store
    [2026-05-06 23:01:22] [store_path] Resolving application handle
    [2026-05-06 23:01:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:22] [load] Reading file content
    [2026-05-06 23:01:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:22] [load] Starting to load store
    [2026-05-06 23:01:22] [store_path] Resolving application handle
    [2026-05-06 23:01:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:22] [load] Reading file content
    [2026-05-06 23:01:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:27] [load] Starting to load store
    [2026-05-06 23:01:27] [store_path] Resolving application handle
    [2026-05-06 23:01:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:27] [load] Reading file content
    [2026-05-06 23:01:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:27] [load] Starting to load store
    [2026-05-06 23:01:27] [store_path] Resolving application handle
    [2026-05-06 23:01:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:27] [load] Reading file content
    [2026-05-06 23:01:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:33] [load] Starting to load store
    [2026-05-06 23:01:33] [store_path] Resolving application handle
    [2026-05-06 23:01:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:33] [load] Reading file content
    [2026-05-06 23:01:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:33] [load] Starting to load store
    [2026-05-06 23:01:33] [store_path] Resolving application handle
    [2026-05-06 23:01:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:33] [load] Reading file content
    [2026-05-06 23:01:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:37] [load] Starting to load store
    [2026-05-06 23:01:37] [store_path] Resolving application handle
    [2026-05-06 23:01:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:37] [load] Reading file content
    [2026-05-06 23:01:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:37] [load] Starting to load store
    [2026-05-06 23:01:37] [store_path] Resolving application handle
    [2026-05-06 23:01:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:37] [load] Reading file content
    [2026-05-06 23:01:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:42] [load] Starting to load store
    [2026-05-06 23:01:42] [store_path] Resolving application handle
    [2026-05-06 23:01:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:42] [load] Reading file content
    [2026-05-06 23:01:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:42] [load] Starting to load store
    [2026-05-06 23:01:42] [store_path] Resolving application handle
    [2026-05-06 23:01:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:42] [load] Reading file content
    [2026-05-06 23:01:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:47] [load] Starting to load store
    [2026-05-06 23:01:47] [store_path] Resolving application handle
    [2026-05-06 23:01:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:47] [load] Reading file content
    [2026-05-06 23:01:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:47] [load] Starting to load store
    [2026-05-06 23:01:47] [store_path] Resolving application handle
    [2026-05-06 23:01:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:47] [load] Reading file content
    [2026-05-06 23:01:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:52] [load] Starting to load store
    [2026-05-06 23:01:52] [store_path] Resolving application handle
    [2026-05-06 23:01:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:52] [load] Reading file content
    [2026-05-06 23:01:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:52] [load] Starting to load store
    [2026-05-06 23:01:52] [store_path] Resolving application handle
    [2026-05-06 23:01:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:52] [load] Reading file content
    [2026-05-06 23:01:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:01:57] [load] Starting to load store
    [2026-05-06 23:01:57] [store_path] Resolving application handle
    [2026-05-06 23:01:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:57] [load] Reading file content
    [2026-05-06 23:01:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:01:57] [load] Starting to load store
    [2026-05-06 23:01:57] [store_path] Resolving application handle
    [2026-05-06 23:01:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:01:57] [load] Reading file content
    [2026-05-06 23:01:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:01:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:02] [load] Starting to load store
    [2026-05-06 23:02:02] [store_path] Resolving application handle
    [2026-05-06 23:02:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:02] [load] Reading file content
    [2026-05-06 23:02:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:02] [load] Starting to load store
    [2026-05-06 23:02:02] [store_path] Resolving application handle
    [2026-05-06 23:02:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:02] [load] Reading file content
    [2026-05-06 23:02:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:07] [load] Starting to load store
    [2026-05-06 23:02:07] [store_path] Resolving application handle
    [2026-05-06 23:02:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:07] [load] Reading file content
    [2026-05-06 23:02:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:07] [load] Starting to load store
    [2026-05-06 23:02:07] [store_path] Resolving application handle
    [2026-05-06 23:02:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:07] [load] Reading file content
    [2026-05-06 23:02:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:12] [load] Starting to load store
    [2026-05-06 23:02:12] [store_path] Resolving application handle
    [2026-05-06 23:02:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:12] [load] Reading file content
    [2026-05-06 23:02:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:12] [load] Starting to load store
    [2026-05-06 23:02:12] [store_path] Resolving application handle
    [2026-05-06 23:02:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:12] [load] Reading file content
    [2026-05-06 23:02:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:17] [load] Starting to load store
    [2026-05-06 23:02:17] [store_path] Resolving application handle
    [2026-05-06 23:02:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:17] [load] Reading file content
    [2026-05-06 23:02:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:17] [load] Starting to load store
    [2026-05-06 23:02:17] [store_path] Resolving application handle
    [2026-05-06 23:02:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:17] [load] Reading file content
    [2026-05-06 23:02:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:22] [load] Starting to load store
    [2026-05-06 23:02:22] [store_path] Resolving application handle
    [2026-05-06 23:02:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:22] [load] Reading file content
    [2026-05-06 23:02:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:22] [load] Starting to load store
    [2026-05-06 23:02:22] [store_path] Resolving application handle
    [2026-05-06 23:02:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:22] [load] Reading file content
    [2026-05-06 23:02:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:27] [load] Starting to load store
    [2026-05-06 23:02:27] [store_path] Resolving application handle
    [2026-05-06 23:02:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:27] [load] Reading file content
    [2026-05-06 23:02:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:27] [load] Starting to load store
    [2026-05-06 23:02:27] [store_path] Resolving application handle
    [2026-05-06 23:02:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:27] [load] Reading file content
    [2026-05-06 23:02:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:32] [load] Starting to load store
    [2026-05-06 23:02:32] [store_path] Resolving application handle
    [2026-05-06 23:02:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:32] [load] Reading file content
    [2026-05-06 23:02:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:32] [load] Starting to load store
    [2026-05-06 23:02:32] [store_path] Resolving application handle
    [2026-05-06 23:02:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:32] [load] Reading file content
    [2026-05-06 23:02:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:37] [load] Starting to load store
    [2026-05-06 23:02:37] [store_path] Resolving application handle
    [2026-05-06 23:02:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:37] [load] Reading file content
    [2026-05-06 23:02:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:37] [load] Starting to load store
    [2026-05-06 23:02:37] [store_path] Resolving application handle
    [2026-05-06 23:02:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:37] [load] Reading file content
    [2026-05-06 23:02:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:42] [load] Starting to load store
    [2026-05-06 23:02:42] [store_path] Resolving application handle
    [2026-05-06 23:02:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:42] [load] Reading file content
    [2026-05-06 23:02:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:42] [load] Starting to load store
    [2026-05-06 23:02:42] [store_path] Resolving application handle
    [2026-05-06 23:02:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:42] [load] Reading file content
    [2026-05-06 23:02:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:47] [load] Starting to load store
    [2026-05-06 23:02:47] [store_path] Resolving application handle
    [2026-05-06 23:02:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:47] [load] Reading file content
    [2026-05-06 23:02:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:47] [load] Starting to load store
    [2026-05-06 23:02:47] [store_path] Resolving application handle
    [2026-05-06 23:02:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:47] [load] Reading file content
    [2026-05-06 23:02:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:52] [load] Starting to load store
    [2026-05-06 23:02:52] [store_path] Resolving application handle
    [2026-05-06 23:02:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:52] [load] Reading file content
    [2026-05-06 23:02:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:52] [load] Starting to load store
    [2026-05-06 23:02:52] [store_path] Resolving application handle
    [2026-05-06 23:02:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:52] [load] Reading file content
    [2026-05-06 23:02:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:02:57] [load] Starting to load store
    [2026-05-06 23:02:57] [store_path] Resolving application handle
    [2026-05-06 23:02:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:57] [load] Reading file content
    [2026-05-06 23:02:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:02:57] [load] Starting to load store
    [2026-05-06 23:02:57] [store_path] Resolving application handle
    [2026-05-06 23:02:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:02:57] [load] Reading file content
    [2026-05-06 23:02:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:02:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:02] [load] Starting to load store
    [2026-05-06 23:03:02] [store_path] Resolving application handle
    [2026-05-06 23:03:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:02] [load] Reading file content
    [2026-05-06 23:03:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:02] [load] Starting to load store
    [2026-05-06 23:03:02] [store_path] Resolving application handle
    [2026-05-06 23:03:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:02] [load] Reading file content
    [2026-05-06 23:03:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:07] [load] Starting to load store
    [2026-05-06 23:03:07] [store_path] Resolving application handle
    [2026-05-06 23:03:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:07] [load] Reading file content
    [2026-05-06 23:03:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:07] [load] Starting to load store
    [2026-05-06 23:03:07] [store_path] Resolving application handle
    [2026-05-06 23:03:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:07] [load] Reading file content
    [2026-05-06 23:03:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:12] [load] Starting to load store
    [2026-05-06 23:03:12] [store_path] Resolving application handle
    [2026-05-06 23:03:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:12] [load] Reading file content
    [2026-05-06 23:03:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:12] [load] Starting to load store
    [2026-05-06 23:03:12] [store_path] Resolving application handle
    [2026-05-06 23:03:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:12] [load] Reading file content
    [2026-05-06 23:03:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:17] [load] Starting to load store
    [2026-05-06 23:03:17] [store_path] Resolving application handle
    [2026-05-06 23:03:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:17] [load] Reading file content
    [2026-05-06 23:03:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:17] [load] Starting to load store
    [2026-05-06 23:03:17] [store_path] Resolving application handle
    [2026-05-06 23:03:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:17] [load] Reading file content
    [2026-05-06 23:03:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:22] [load] Starting to load store
    [2026-05-06 23:03:22] [store_path] Resolving application handle
    [2026-05-06 23:03:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:22] [load] Reading file content
    [2026-05-06 23:03:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:22] [load] Starting to load store
    [2026-05-06 23:03:22] [store_path] Resolving application handle
    [2026-05-06 23:03:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:22] [load] Reading file content
    [2026-05-06 23:03:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:27] [load] Starting to load store
    [2026-05-06 23:03:27] [store_path] Resolving application handle
    [2026-05-06 23:03:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:27] [load] Reading file content
    [2026-05-06 23:03:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:27] [load] Starting to load store
    [2026-05-06 23:03:27] [store_path] Resolving application handle
    [2026-05-06 23:03:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:27] [load] Reading file content
    [2026-05-06 23:03:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:32] [load] Starting to load store
    [2026-05-06 23:03:32] [store_path] Resolving application handle
    [2026-05-06 23:03:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:32] [load] Reading file content
    [2026-05-06 23:03:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:33] [load] Starting to load store
    [2026-05-06 23:03:33] [store_path] Resolving application handle
    [2026-05-06 23:03:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:33] [load] Reading file content
    [2026-05-06 23:03:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:40] [load] Starting to load store
    [2026-05-06 23:03:40] [store_path] Resolving application handle
    [2026-05-06 23:03:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:40] [load] Reading file content
    [2026-05-06 23:03:40] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:40] [load] Starting to load store
    [2026-05-06 23:03:40] [store_path] Resolving application handle
    [2026-05-06 23:03:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:40] [load] Reading file content
    [2026-05-06 23:03:40] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:46] [load] Starting to load store
    [2026-05-06 23:03:46] [store_path] Resolving application handle
    [2026-05-06 23:03:46] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:46] [load] Reading file content
    [2026-05-06 23:03:46] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:46] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:47] [load] Starting to load store
    [2026-05-06 23:03:47] [store_path] Resolving application handle
    [2026-05-06 23:03:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:47] [load] Reading file content
    [2026-05-06 23:03:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:50] [load] Starting to load store
    [2026-05-06 23:03:50] [store_path] Resolving application handle
    [2026-05-06 23:03:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:50] [load] Reading file content
    [2026-05-06 23:03:50] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:51] [load] Starting to load store
    [2026-05-06 23:03:51] [store_path] Resolving application handle
    [2026-05-06 23:03:51] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:51] [load] Reading file content
    [2026-05-06 23:03:51] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:51] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:53] [load] Starting to load store
    [2026-05-06 23:03:53] [store_path] Resolving application handle
    [2026-05-06 23:03:53] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:53] [load] Reading file content
    [2026-05-06 23:03:53] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:53] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:53] [load] Starting to load store
    [2026-05-06 23:03:53] [store_path] Resolving application handle
    [2026-05-06 23:03:53] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:53] [load] Reading file content
    [2026-05-06 23:03:53] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:53] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:03:57] [load] Starting to load store
    [2026-05-06 23:03:57] [store_path] Resolving application handle
    [2026-05-06 23:03:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:57] [load] Reading file content
    [2026-05-06 23:03:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:03:57] [load] Starting to load store
    [2026-05-06 23:03:57] [store_path] Resolving application handle
    [2026-05-06 23:03:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:03:57] [load] Reading file content
    [2026-05-06 23:03:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:03:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:02] [load] Starting to load store
    [2026-05-06 23:04:02] [store_path] Resolving application handle
    [2026-05-06 23:04:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:02] [load] Reading file content
    [2026-05-06 23:04:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:02] [load] Starting to load store
    [2026-05-06 23:04:02] [store_path] Resolving application handle
    [2026-05-06 23:04:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:02] [load] Reading file content
    [2026-05-06 23:04:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:07] [load] Starting to load store
    [2026-05-06 23:04:07] [store_path] Resolving application handle
    [2026-05-06 23:04:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:07] [load] Reading file content
    [2026-05-06 23:04:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:07] [load] Starting to load store
    [2026-05-06 23:04:07] [store_path] Resolving application handle
    [2026-05-06 23:04:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:07] [load] Reading file content
    [2026-05-06 23:04:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:12] [load] Starting to load store
    [2026-05-06 23:04:12] [store_path] Resolving application handle
    [2026-05-06 23:04:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:12] [load] Reading file content
    [2026-05-06 23:04:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:12] [load] Starting to load store
    [2026-05-06 23:04:12] [store_path] Resolving application handle
    [2026-05-06 23:04:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:12] [load] Reading file content
    [2026-05-06 23:04:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:17] [load] Starting to load store
    [2026-05-06 23:04:17] [store_path] Resolving application handle
    [2026-05-06 23:04:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:17] [load] Reading file content
    [2026-05-06 23:04:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:17] [load] Starting to load store
    [2026-05-06 23:04:17] [store_path] Resolving application handle
    [2026-05-06 23:04:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:17] [load] Reading file content
    [2026-05-06 23:04:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:22] [load] Starting to load store
    [2026-05-06 23:04:22] [store_path] Resolving application handle
    [2026-05-06 23:04:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:22] [load] Reading file content
    [2026-05-06 23:04:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:22] [load] Starting to load store
    [2026-05-06 23:04:22] [store_path] Resolving application handle
    [2026-05-06 23:04:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:22] [load] Reading file content
    [2026-05-06 23:04:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:27] [load] Starting to load store
    [2026-05-06 23:04:27] [store_path] Resolving application handle
    [2026-05-06 23:04:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:27] [load] Reading file content
    [2026-05-06 23:04:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:27] [load] Starting to load store
    [2026-05-06 23:04:27] [store_path] Resolving application handle
    [2026-05-06 23:04:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:27] [load] Reading file content
    [2026-05-06 23:04:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:32] [load] Starting to load store
    [2026-05-06 23:04:32] [store_path] Resolving application handle
    [2026-05-06 23:04:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:32] [load] Reading file content
    [2026-05-06 23:04:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:32] [load] Starting to load store
    [2026-05-06 23:04:32] [store_path] Resolving application handle
    [2026-05-06 23:04:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:32] [load] Reading file content
    [2026-05-06 23:04:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:37] [load] Starting to load store
    [2026-05-06 23:04:37] [store_path] Resolving application handle
    [2026-05-06 23:04:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:37] [load] Reading file content
    [2026-05-06 23:04:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:37] [load] Starting to load store
    [2026-05-06 23:04:37] [store_path] Resolving application handle
    [2026-05-06 23:04:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:37] [load] Reading file content
    [2026-05-06 23:04:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:42] [load] Starting to load store
    [2026-05-06 23:04:42] [store_path] Resolving application handle
    [2026-05-06 23:04:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:42] [load] Reading file content
    [2026-05-06 23:04:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:42] [load] Starting to load store
    [2026-05-06 23:04:42] [store_path] Resolving application handle
    [2026-05-06 23:04:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:42] [load] Reading file content
    [2026-05-06 23:04:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:47] [load] Starting to load store
    [2026-05-06 23:04:47] [store_path] Resolving application handle
    [2026-05-06 23:04:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:47] [load] Reading file content
    [2026-05-06 23:04:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:47] [load] Starting to load store
    [2026-05-06 23:04:47] [store_path] Resolving application handle
    [2026-05-06 23:04:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:47] [load] Reading file content
    [2026-05-06 23:04:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:52] [load] Starting to load store
    [2026-05-06 23:04:52] [store_path] Resolving application handle
    [2026-05-06 23:04:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:52] [load] Reading file content
    [2026-05-06 23:04:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:52] [load] Starting to load store
    [2026-05-06 23:04:52] [store_path] Resolving application handle
    [2026-05-06 23:04:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:52] [load] Reading file content
    [2026-05-06 23:04:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:04:57] [load] Starting to load store
    [2026-05-06 23:04:57] [store_path] Resolving application handle
    [2026-05-06 23:04:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:57] [load] Reading file content
    [2026-05-06 23:04:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:04:57] [load] Starting to load store
    [2026-05-06 23:04:57] [store_path] Resolving application handle
    [2026-05-06 23:04:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:04:57] [load] Reading file content
    [2026-05-06 23:04:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:04:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:02] [load] Starting to load store
    [2026-05-06 23:05:02] [store_path] Resolving application handle
    [2026-05-06 23:05:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:02] [load] Reading file content
    [2026-05-06 23:05:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:02] [load] Starting to load store
    [2026-05-06 23:05:02] [store_path] Resolving application handle
    [2026-05-06 23:05:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:02] [load] Reading file content
    [2026-05-06 23:05:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:07] [load] Starting to load store
    [2026-05-06 23:05:07] [store_path] Resolving application handle
    [2026-05-06 23:05:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:07] [load] Reading file content
    [2026-05-06 23:05:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:07] [load] Starting to load store
    [2026-05-06 23:05:07] [store_path] Resolving application handle
    [2026-05-06 23:05:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:07] [load] Reading file content
    [2026-05-06 23:05:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:12] [load] Starting to load store
    [2026-05-06 23:05:12] [store_path] Resolving application handle
    [2026-05-06 23:05:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:12] [load] Reading file content
    [2026-05-06 23:05:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:12] [load] Starting to load store
    [2026-05-06 23:05:12] [store_path] Resolving application handle
    [2026-05-06 23:05:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:12] [load] Reading file content
    [2026-05-06 23:05:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:17] [load] Starting to load store
    [2026-05-06 23:05:17] [store_path] Resolving application handle
    [2026-05-06 23:05:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:17] [load] Reading file content
    [2026-05-06 23:05:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:17] [load] Starting to load store
    [2026-05-06 23:05:17] [store_path] Resolving application handle
    [2026-05-06 23:05:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:17] [load] Reading file content
    [2026-05-06 23:05:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:22] [load] Starting to load store
    [2026-05-06 23:05:22] [store_path] Resolving application handle
    [2026-05-06 23:05:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:22] [load] Reading file content
    [2026-05-06 23:05:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:22] [load] Starting to load store
    [2026-05-06 23:05:22] [store_path] Resolving application handle
    [2026-05-06 23:05:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:22] [load] Reading file content
    [2026-05-06 23:05:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:27] [load] Starting to load store
    [2026-05-06 23:05:27] [store_path] Resolving application handle
    [2026-05-06 23:05:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:27] [load] Reading file content
    [2026-05-06 23:05:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:27] [load] Starting to load store
    [2026-05-06 23:05:27] [store_path] Resolving application handle
    [2026-05-06 23:05:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:27] [load] Reading file content
    [2026-05-06 23:05:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:32] [load] Starting to load store
    [2026-05-06 23:05:32] [store_path] Resolving application handle
    [2026-05-06 23:05:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:32] [load] Reading file content
    [2026-05-06 23:05:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:32] [load] Starting to load store
    [2026-05-06 23:05:32] [store_path] Resolving application handle
    [2026-05-06 23:05:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:32] [load] Reading file content
    [2026-05-06 23:05:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:37] [load] Starting to load store
    [2026-05-06 23:05:37] [store_path] Resolving application handle
    [2026-05-06 23:05:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:37] [load] Reading file content
    [2026-05-06 23:05:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:37] [load] Starting to load store
    [2026-05-06 23:05:37] [store_path] Resolving application handle
    [2026-05-06 23:05:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:37] [load] Reading file content
    [2026-05-06 23:05:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:42] [load] Starting to load store
    [2026-05-06 23:05:42] [store_path] Resolving application handle
    [2026-05-06 23:05:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:42] [load] Reading file content
    [2026-05-06 23:05:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:42] [load] Starting to load store
    [2026-05-06 23:05:42] [store_path] Resolving application handle
    [2026-05-06 23:05:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:42] [load] Reading file content
    [2026-05-06 23:05:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:48] [load] Starting to load store
    [2026-05-06 23:05:48] [store_path] Resolving application handle
    [2026-05-06 23:05:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:48] [load] Reading file content
    [2026-05-06 23:05:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:48] [load] Starting to load store
    [2026-05-06 23:05:48] [store_path] Resolving application handle
    [2026-05-06 23:05:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:48] [load] Reading file content
    [2026-05-06 23:05:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:05:55] [load] Starting to load store
    [2026-05-06 23:05:55] [store_path] Resolving application handle
    [2026-05-06 23:05:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:55] [load] Reading file content
    [2026-05-06 23:05:55] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:05:55] [load] Starting to load store
    [2026-05-06 23:05:55] [store_path] Resolving application handle
    [2026-05-06 23:05:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:05:55] [load] Reading file content
    [2026-05-06 23:05:55] [load] File read successfully (578 bytes)
    [2026-05-06 23:05:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:01] [load] Starting to load store
    [2026-05-06 23:06:01] [store_path] Resolving application handle
    [2026-05-06 23:06:01] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:01] [load] Reading file content
    [2026-05-06 23:06:01] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:01] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:01] [load] Starting to load store
    [2026-05-06 23:06:01] [store_path] Resolving application handle
    [2026-05-06 23:06:01] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:01] [load] Reading file content
    [2026-05-06 23:06:01] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:01] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:03] [load] Starting to load store
    [2026-05-06 23:06:03] [store_path] Resolving application handle
    [2026-05-06 23:06:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:03] [load] Reading file content
    [2026-05-06 23:06:04] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:04] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:04] [load] Starting to load store
    [2026-05-06 23:06:04] [store_path] Resolving application handle
    [2026-05-06 23:06:04] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:04] [load] Reading file content
    [2026-05-06 23:06:04] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:04] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:08] [load] Starting to load store
    [2026-05-06 23:06:08] [store_path] Resolving application handle
    [2026-05-06 23:06:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:08] [load] Reading file content
    [2026-05-06 23:06:08] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:08] [load] Starting to load store
    [2026-05-06 23:06:08] [store_path] Resolving application handle
    [2026-05-06 23:06:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:08] [load] Reading file content
    [2026-05-06 23:06:08] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:12] [load] Starting to load store
    [2026-05-06 23:06:12] [store_path] Resolving application handle
    [2026-05-06 23:06:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:12] [load] Reading file content
    [2026-05-06 23:06:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:12] [load] Starting to load store
    [2026-05-06 23:06:12] [store_path] Resolving application handle
    [2026-05-06 23:06:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:12] [load] Reading file content
    [2026-05-06 23:06:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:17] [load] Starting to load store
    [2026-05-06 23:06:17] [store_path] Resolving application handle
    [2026-05-06 23:06:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:17] [load] Reading file content
    [2026-05-06 23:06:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:17] [load] Starting to load store
    [2026-05-06 23:06:17] [store_path] Resolving application handle
    [2026-05-06 23:06:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:17] [load] Reading file content
    [2026-05-06 23:06:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:22] [load] Starting to load store
    [2026-05-06 23:06:22] [store_path] Resolving application handle
    [2026-05-06 23:06:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:22] [load] Reading file content
    [2026-05-06 23:06:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:22] [load] Starting to load store
    [2026-05-06 23:06:22] [store_path] Resolving application handle
    [2026-05-06 23:06:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:22] [load] Reading file content
    [2026-05-06 23:06:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:30] [load] Starting to load store
    [2026-05-06 23:06:30] [store_path] Resolving application handle
    [2026-05-06 23:06:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:31] [load] Reading file content
    [2026-05-06 23:06:31] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:31] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:31] [load] Starting to load store
    [2026-05-06 23:06:31] [store_path] Resolving application handle
    [2026-05-06 23:06:31] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:31] [load] Reading file content
    [2026-05-06 23:06:31] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:31] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:33] [load] Starting to load store
    [2026-05-06 23:06:33] [store_path] Resolving application handle
    [2026-05-06 23:06:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:33] [load] Reading file content
    [2026-05-06 23:06:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:33] [load] Starting to load store
    [2026-05-06 23:06:33] [store_path] Resolving application handle
    [2026-05-06 23:06:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:33] [load] Reading file content
    [2026-05-06 23:06:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:37] [load] Starting to load store
    [2026-05-06 23:06:37] [store_path] Resolving application handle
    [2026-05-06 23:06:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:37] [load] Reading file content
    [2026-05-06 23:06:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:37] [load] Starting to load store
    [2026-05-06 23:06:37] [store_path] Resolving application handle
    [2026-05-06 23:06:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:37] [load] Reading file content
    [2026-05-06 23:06:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:42] [load] Starting to load store
    [2026-05-06 23:06:42] [store_path] Resolving application handle
    [2026-05-06 23:06:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:42] [load] Reading file content
    [2026-05-06 23:06:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:42] [load] Starting to load store
    [2026-05-06 23:06:42] [store_path] Resolving application handle
    [2026-05-06 23:06:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:42] [load] Reading file content
    [2026-05-06 23:06:43] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:43] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:50] [load] Starting to load store
    [2026-05-06 23:06:50] [store_path] Resolving application handle
    [2026-05-06 23:06:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:50] [load] Reading file content
    [2026-05-06 23:06:50] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:50] [load] Starting to load store
    [2026-05-06 23:06:50] [store_path] Resolving application handle
    [2026-05-06 23:06:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:50] [load] Reading file content
    [2026-05-06 23:06:50] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:53] [load] Starting to load store
    [2026-05-06 23:06:53] [store_path] Resolving application handle
    [2026-05-06 23:06:53] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:53] [load] Reading file content
    [2026-05-06 23:06:53] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:53] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:53] [load] Starting to load store
    [2026-05-06 23:06:53] [store_path] Resolving application handle
    [2026-05-06 23:06:53] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:53] [load] Reading file content
    [2026-05-06 23:06:53] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:53] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:06:57] [load] Starting to load store
    [2026-05-06 23:06:57] [store_path] Resolving application handle
    [2026-05-06 23:06:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:57] [load] Reading file content
    [2026-05-06 23:06:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:06:57] [load] Starting to load store
    [2026-05-06 23:06:57] [store_path] Resolving application handle
    [2026-05-06 23:06:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:06:57] [load] Reading file content
    [2026-05-06 23:06:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:06:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:02] [load] Starting to load store
    [2026-05-06 23:07:02] [store_path] Resolving application handle
    [2026-05-06 23:07:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:02] [load] Reading file content
    [2026-05-06 23:07:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:02] [load] Starting to load store
    [2026-05-06 23:07:02] [store_path] Resolving application handle
    [2026-05-06 23:07:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:02] [load] Reading file content
    [2026-05-06 23:07:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:07] [load] Starting to load store
    [2026-05-06 23:07:07] [store_path] Resolving application handle
    [2026-05-06 23:07:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:07] [load] Reading file content
    [2026-05-06 23:07:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:07] [load] Starting to load store
    [2026-05-06 23:07:07] [store_path] Resolving application handle
    [2026-05-06 23:07:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:07] [load] Reading file content
    [2026-05-06 23:07:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:12] [load] Starting to load store
    [2026-05-06 23:07:12] [store_path] Resolving application handle
    [2026-05-06 23:07:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:12] [load] Reading file content
    [2026-05-06 23:07:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:12] [load] Starting to load store
    [2026-05-06 23:07:12] [store_path] Resolving application handle
    [2026-05-06 23:07:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:12] [load] Reading file content
    [2026-05-06 23:07:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:17] [load] Starting to load store
    [2026-05-06 23:07:17] [store_path] Resolving application handle
    [2026-05-06 23:07:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:17] [load] Reading file content
    [2026-05-06 23:07:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:17] [load] Starting to load store
    [2026-05-06 23:07:17] [store_path] Resolving application handle
    [2026-05-06 23:07:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:17] [load] Reading file content
    [2026-05-06 23:07:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:22] [load] Starting to load store
    [2026-05-06 23:07:22] [store_path] Resolving application handle
    [2026-05-06 23:07:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:22] [load] Reading file content
    [2026-05-06 23:07:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:22] [load] Starting to load store
    [2026-05-06 23:07:22] [store_path] Resolving application handle
    [2026-05-06 23:07:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:22] [load] Reading file content
    [2026-05-06 23:07:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:27] [load] Starting to load store
    [2026-05-06 23:07:27] [store_path] Resolving application handle
    [2026-05-06 23:07:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:27] [load] Reading file content
    [2026-05-06 23:07:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:27] [load] Starting to load store
    [2026-05-06 23:07:27] [store_path] Resolving application handle
    [2026-05-06 23:07:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:27] [load] Reading file content
    [2026-05-06 23:07:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:35] [load] Starting to load store
    [2026-05-06 23:07:35] [store_path] Resolving application handle
    [2026-05-06 23:07:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:35] [load] Reading file content
    [2026-05-06 23:07:35] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:35] [load] Starting to load store
    [2026-05-06 23:07:36] [store_path] Resolving application handle
    [2026-05-06 23:07:36] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:36] [load] Reading file content
    [2026-05-06 23:07:36] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:36] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:40] [load] Starting to load store
    [2026-05-06 23:07:40] [store_path] Resolving application handle
    [2026-05-06 23:07:40] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:40] [load] Reading file content
    [2026-05-06 23:07:41] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:41] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:41] [load] Starting to load store
    [2026-05-06 23:07:41] [store_path] Resolving application handle
    [2026-05-06 23:07:41] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:41] [load] Reading file content
    [2026-05-06 23:07:41] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:41] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:42] [load] Starting to load store
    [2026-05-06 23:07:42] [store_path] Resolving application handle
    [2026-05-06 23:07:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:42] [load] Reading file content
    [2026-05-06 23:07:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:42] [load] Starting to load store
    [2026-05-06 23:07:42] [store_path] Resolving application handle
    [2026-05-06 23:07:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:42] [load] Reading file content
    [2026-05-06 23:07:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:47] [load] Starting to load store
    [2026-05-06 23:07:47] [store_path] Resolving application handle
    [2026-05-06 23:07:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:47] [load] Reading file content
    [2026-05-06 23:07:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:47] [load] Starting to load store
    [2026-05-06 23:07:47] [store_path] Resolving application handle
    [2026-05-06 23:07:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:47] [load] Reading file content
    [2026-05-06 23:07:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:52] [load] Starting to load store
    [2026-05-06 23:07:52] [store_path] Resolving application handle
    [2026-05-06 23:07:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:52] [load] Reading file content
    [2026-05-06 23:07:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:52] [load] Starting to load store
    [2026-05-06 23:07:52] [store_path] Resolving application handle
    [2026-05-06 23:07:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:52] [load] Reading file content
    [2026-05-06 23:07:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:07:57] [load] Starting to load store
    [2026-05-06 23:07:57] [store_path] Resolving application handle
    [2026-05-06 23:07:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:57] [load] Reading file content
    [2026-05-06 23:07:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:07:57] [load] Starting to load store
    [2026-05-06 23:07:57] [store_path] Resolving application handle
    [2026-05-06 23:07:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:07:57] [load] Reading file content
    [2026-05-06 23:07:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:07:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:03] [load] Starting to load store
    [2026-05-06 23:08:03] [store_path] Resolving application handle
    [2026-05-06 23:08:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:03] [load] Reading file content
    [2026-05-06 23:08:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:03] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:03] [load] Starting to load store
    [2026-05-06 23:08:03] [store_path] Resolving application handle
    [2026-05-06 23:08:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:03] [load] Reading file content
    [2026-05-06 23:08:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:03] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:07] [load] Starting to load store
    [2026-05-06 23:08:07] [store_path] Resolving application handle
    [2026-05-06 23:08:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:07] [load] Reading file content
    [2026-05-06 23:08:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:07] [load] Starting to load store
    [2026-05-06 23:08:07] [store_path] Resolving application handle
    [2026-05-06 23:08:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:07] [load] Reading file content
    [2026-05-06 23:08:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:12] [load] Starting to load store
    [2026-05-06 23:08:12] [store_path] Resolving application handle
    [2026-05-06 23:08:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:12] [load] Reading file content
    [2026-05-06 23:08:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:12] [load] Starting to load store
    [2026-05-06 23:08:12] [store_path] Resolving application handle
    [2026-05-06 23:08:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:12] [load] Reading file content
    [2026-05-06 23:08:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:17] [load] Starting to load store
    [2026-05-06 23:08:17] [store_path] Resolving application handle
    [2026-05-06 23:08:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:17] [load] Reading file content
    [2026-05-06 23:08:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:17] [load] Starting to load store
    [2026-05-06 23:08:17] [store_path] Resolving application handle
    [2026-05-06 23:08:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:17] [load] Reading file content
    [2026-05-06 23:08:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:22] [load] Starting to load store
    [2026-05-06 23:08:22] [store_path] Resolving application handle
    [2026-05-06 23:08:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:22] [load] Reading file content
    [2026-05-06 23:08:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:22] [load] Starting to load store
    [2026-05-06 23:08:22] [store_path] Resolving application handle
    [2026-05-06 23:08:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:22] [load] Reading file content
    [2026-05-06 23:08:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:27] [load] Starting to load store
    [2026-05-06 23:08:27] [store_path] Resolving application handle
    [2026-05-06 23:08:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:27] [load] Reading file content
    [2026-05-06 23:08:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:27] [load] Starting to load store
    [2026-05-06 23:08:27] [store_path] Resolving application handle
    [2026-05-06 23:08:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:27] [load] Reading file content
    [2026-05-06 23:08:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:32] [load] Starting to load store
    [2026-05-06 23:08:32] [store_path] Resolving application handle
    [2026-05-06 23:08:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:32] [load] Reading file content
    [2026-05-06 23:08:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:32] [load] Starting to load store
    [2026-05-06 23:08:32] [store_path] Resolving application handle
    [2026-05-06 23:08:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:32] [load] Reading file content
    [2026-05-06 23:08:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:37] [load] Starting to load store
    [2026-05-06 23:08:37] [store_path] Resolving application handle
    [2026-05-06 23:08:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:37] [load] Reading file content
    [2026-05-06 23:08:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:37] [load] Starting to load store
    [2026-05-06 23:08:37] [store_path] Resolving application handle
    [2026-05-06 23:08:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:37] [load] Reading file content
    [2026-05-06 23:08:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:42] [load] Starting to load store
    [2026-05-06 23:08:42] [store_path] Resolving application handle
    [2026-05-06 23:08:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:42] [load] Reading file content
    [2026-05-06 23:08:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:42] [load] Starting to load store
    [2026-05-06 23:08:42] [store_path] Resolving application handle
    [2026-05-06 23:08:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:42] [load] Reading file content
    [2026-05-06 23:08:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:47] [load] Starting to load store
    [2026-05-06 23:08:47] [store_path] Resolving application handle
    [2026-05-06 23:08:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:47] [load] Reading file content
    [2026-05-06 23:08:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:47] [load] Starting to load store
    [2026-05-06 23:08:47] [store_path] Resolving application handle
    [2026-05-06 23:08:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:47] [load] Reading file content
    [2026-05-06 23:08:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:52] [load] Starting to load store
    [2026-05-06 23:08:52] [store_path] Resolving application handle
    [2026-05-06 23:08:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:52] [load] Reading file content
    [2026-05-06 23:08:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:52] [load] Starting to load store
    [2026-05-06 23:08:52] [store_path] Resolving application handle
    [2026-05-06 23:08:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:52] [load] Reading file content
    [2026-05-06 23:08:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:08:57] [load] Starting to load store
    [2026-05-06 23:08:57] [store_path] Resolving application handle
    [2026-05-06 23:08:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:57] [load] Reading file content
    [2026-05-06 23:08:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:08:57] [load] Starting to load store
    [2026-05-06 23:08:57] [store_path] Resolving application handle
    [2026-05-06 23:08:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:08:57] [load] Reading file content
    [2026-05-06 23:08:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:08:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:02] [load] Starting to load store
    [2026-05-06 23:09:02] [store_path] Resolving application handle
    [2026-05-06 23:09:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:02] [load] Reading file content
    [2026-05-06 23:09:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:02] [load] Starting to load store
    [2026-05-06 23:09:02] [store_path] Resolving application handle
    [2026-05-06 23:09:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:02] [load] Reading file content
    [2026-05-06 23:09:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:07] [load] Starting to load store
    [2026-05-06 23:09:07] [store_path] Resolving application handle
    [2026-05-06 23:09:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:07] [load] Reading file content
    [2026-05-06 23:09:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:07] [load] Starting to load store
    [2026-05-06 23:09:07] [store_path] Resolving application handle
    [2026-05-06 23:09:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:07] [load] Reading file content
    [2026-05-06 23:09:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:12] [load] Starting to load store
    [2026-05-06 23:09:12] [store_path] Resolving application handle
    [2026-05-06 23:09:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:12] [load] Reading file content
    [2026-05-06 23:09:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:12] [load] Starting to load store
    [2026-05-06 23:09:12] [store_path] Resolving application handle
    [2026-05-06 23:09:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:12] [load] Reading file content
    [2026-05-06 23:09:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:17] [load] Starting to load store
    [2026-05-06 23:09:17] [store_path] Resolving application handle
    [2026-05-06 23:09:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:17] [load] Reading file content
    [2026-05-06 23:09:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:17] [load] Starting to load store
    [2026-05-06 23:09:17] [store_path] Resolving application handle
    [2026-05-06 23:09:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:17] [load] Reading file content
    [2026-05-06 23:09:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:22] [load] Starting to load store
    [2026-05-06 23:09:22] [store_path] Resolving application handle
    [2026-05-06 23:09:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:22] [load] Reading file content
    [2026-05-06 23:09:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:22] [load] Starting to load store
    [2026-05-06 23:09:22] [store_path] Resolving application handle
    [2026-05-06 23:09:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:22] [load] Reading file content
    [2026-05-06 23:09:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:27] [load] Starting to load store
    [2026-05-06 23:09:27] [store_path] Resolving application handle
    [2026-05-06 23:09:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:27] [load] Reading file content
    [2026-05-06 23:09:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:27] [load] Starting to load store
    [2026-05-06 23:09:27] [store_path] Resolving application handle
    [2026-05-06 23:09:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:27] [load] Reading file content
    [2026-05-06 23:09:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:32] [load] Starting to load store
    [2026-05-06 23:09:32] [store_path] Resolving application handle
    [2026-05-06 23:09:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:32] [load] Reading file content
    [2026-05-06 23:09:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:32] [load] Starting to load store
    [2026-05-06 23:09:32] [store_path] Resolving application handle
    [2026-05-06 23:09:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:32] [load] Reading file content
    [2026-05-06 23:09:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:37] [load] Starting to load store
    [2026-05-06 23:09:37] [store_path] Resolving application handle
    [2026-05-06 23:09:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:37] [load] Reading file content
    [2026-05-06 23:09:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:37] [load] Starting to load store
    [2026-05-06 23:09:37] [store_path] Resolving application handle
    [2026-05-06 23:09:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:37] [load] Reading file content
    [2026-05-06 23:09:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:42] [load] Starting to load store
    [2026-05-06 23:09:42] [store_path] Resolving application handle
    [2026-05-06 23:09:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:42] [load] Reading file content
    [2026-05-06 23:09:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:42] [load] Starting to load store
    [2026-05-06 23:09:42] [store_path] Resolving application handle
    [2026-05-06 23:09:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:42] [load] Reading file content
    [2026-05-06 23:09:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:47] [load] Starting to load store
    [2026-05-06 23:09:47] [store_path] Resolving application handle
    [2026-05-06 23:09:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:47] [load] Reading file content
    [2026-05-06 23:09:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:47] [load] Starting to load store
    [2026-05-06 23:09:47] [store_path] Resolving application handle
    [2026-05-06 23:09:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:47] [load] Reading file content
    [2026-05-06 23:09:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:52] [load] Starting to load store
    [2026-05-06 23:09:52] [store_path] Resolving application handle
    [2026-05-06 23:09:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:52] [load] Reading file content
    [2026-05-06 23:09:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:52] [load] Starting to load store
    [2026-05-06 23:09:52] [store_path] Resolving application handle
    [2026-05-06 23:09:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:52] [load] Reading file content
    [2026-05-06 23:09:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:09:57] [load] Starting to load store
    [2026-05-06 23:09:57] [store_path] Resolving application handle
    [2026-05-06 23:09:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:57] [load] Reading file content
    [2026-05-06 23:09:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:09:57] [load] Starting to load store
    [2026-05-06 23:09:57] [store_path] Resolving application handle
    [2026-05-06 23:09:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:09:57] [load] Reading file content
    [2026-05-06 23:09:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:09:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:02] [load] Starting to load store
    [2026-05-06 23:10:02] [store_path] Resolving application handle
    [2026-05-06 23:10:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:02] [load] Reading file content
    [2026-05-06 23:10:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:02] [load] Starting to load store
    [2026-05-06 23:10:02] [store_path] Resolving application handle
    [2026-05-06 23:10:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:02] [load] Reading file content
    [2026-05-06 23:10:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:07] [load] Starting to load store
    [2026-05-06 23:10:07] [store_path] Resolving application handle
    [2026-05-06 23:10:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:07] [load] Reading file content
    [2026-05-06 23:10:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:07] [load] Starting to load store
    [2026-05-06 23:10:07] [store_path] Resolving application handle
    [2026-05-06 23:10:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:07] [load] Reading file content
    [2026-05-06 23:10:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:12] [load] Starting to load store
    [2026-05-06 23:10:12] [store_path] Resolving application handle
    [2026-05-06 23:10:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:12] [load] Reading file content
    [2026-05-06 23:10:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:12] [load] Starting to load store
    [2026-05-06 23:10:12] [store_path] Resolving application handle
    [2026-05-06 23:10:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:12] [load] Reading file content
    [2026-05-06 23:10:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:17] [load] Starting to load store
    [2026-05-06 23:10:17] [store_path] Resolving application handle
    [2026-05-06 23:10:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:17] [load] Reading file content
    [2026-05-06 23:10:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:17] [load] Starting to load store
    [2026-05-06 23:10:17] [store_path] Resolving application handle
    [2026-05-06 23:10:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:17] [load] Reading file content
    [2026-05-06 23:10:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:22] [load] Starting to load store
    [2026-05-06 23:10:22] [store_path] Resolving application handle
    [2026-05-06 23:10:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:22] [load] Reading file content
    [2026-05-06 23:10:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:22] [load] Starting to load store
    [2026-05-06 23:10:22] [store_path] Resolving application handle
    [2026-05-06 23:10:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:22] [load] Reading file content
    [2026-05-06 23:10:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:27] [load] Starting to load store
    [2026-05-06 23:10:27] [store_path] Resolving application handle
    [2026-05-06 23:10:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:27] [load] Reading file content
    [2026-05-06 23:10:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:27] [load] Starting to load store
    [2026-05-06 23:10:27] [store_path] Resolving application handle
    [2026-05-06 23:10:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:27] [load] Reading file content
    [2026-05-06 23:10:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:32] [load] Starting to load store
    [2026-05-06 23:10:32] [store_path] Resolving application handle
    [2026-05-06 23:10:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:32] [load] Reading file content
    [2026-05-06 23:10:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:32] [load] Starting to load store
    [2026-05-06 23:10:32] [store_path] Resolving application handle
    [2026-05-06 23:10:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:32] [load] Reading file content
    [2026-05-06 23:10:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:37] [load] Starting to load store
    [2026-05-06 23:10:37] [store_path] Resolving application handle
    [2026-05-06 23:10:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:37] [load] Reading file content
    [2026-05-06 23:10:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:37] [load] Starting to load store
    [2026-05-06 23:10:37] [store_path] Resolving application handle
    [2026-05-06 23:10:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:37] [load] Reading file content
    [2026-05-06 23:10:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:42] [load] Starting to load store
    [2026-05-06 23:10:42] [store_path] Resolving application handle
    [2026-05-06 23:10:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:42] [load] Reading file content
    [2026-05-06 23:10:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:42] [load] Starting to load store
    [2026-05-06 23:10:42] [store_path] Resolving application handle
    [2026-05-06 23:10:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:42] [load] Reading file content
    [2026-05-06 23:10:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:47] [load] Starting to load store
    [2026-05-06 23:10:47] [store_path] Resolving application handle
    [2026-05-06 23:10:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:47] [load] Reading file content
    [2026-05-06 23:10:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:47] [load] Starting to load store
    [2026-05-06 23:10:47] [store_path] Resolving application handle
    [2026-05-06 23:10:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:47] [load] Reading file content
    [2026-05-06 23:10:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:52] [load] Starting to load store
    [2026-05-06 23:10:52] [store_path] Resolving application handle
    [2026-05-06 23:10:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:52] [load] Reading file content
    [2026-05-06 23:10:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:52] [load] Starting to load store
    [2026-05-06 23:10:52] [store_path] Resolving application handle
    [2026-05-06 23:10:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:52] [load] Reading file content
    [2026-05-06 23:10:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:10:57] [load] Starting to load store
    [2026-05-06 23:10:57] [store_path] Resolving application handle
    [2026-05-06 23:10:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:57] [load] Reading file content
    [2026-05-06 23:10:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:10:57] [load] Starting to load store
    [2026-05-06 23:10:57] [store_path] Resolving application handle
    [2026-05-06 23:10:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:10:57] [load] Reading file content
    [2026-05-06 23:10:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:10:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:02] [load] Starting to load store
    [2026-05-06 23:11:02] [store_path] Resolving application handle
    [2026-05-06 23:11:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:02] [load] Reading file content
    [2026-05-06 23:11:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:02] [load] Starting to load store
    [2026-05-06 23:11:02] [store_path] Resolving application handle
    [2026-05-06 23:11:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:02] [load] Reading file content
    [2026-05-06 23:11:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:07] [load] Starting to load store
    [2026-05-06 23:11:07] [store_path] Resolving application handle
    [2026-05-06 23:11:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:07] [load] Reading file content
    [2026-05-06 23:11:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:07] [load] Starting to load store
    [2026-05-06 23:11:07] [store_path] Resolving application handle
    [2026-05-06 23:11:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:07] [load] Reading file content
    [2026-05-06 23:11:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:12] [load] Starting to load store
    [2026-05-06 23:11:12] [store_path] Resolving application handle
    [2026-05-06 23:11:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:12] [load] Reading file content
    [2026-05-06 23:11:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:12] [load] Starting to load store
    [2026-05-06 23:11:12] [store_path] Resolving application handle
    [2026-05-06 23:11:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:12] [load] Reading file content
    [2026-05-06 23:11:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:17] [load] Starting to load store
    [2026-05-06 23:11:17] [store_path] Resolving application handle
    [2026-05-06 23:11:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:17] [load] Reading file content
    [2026-05-06 23:11:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:17] [load] Starting to load store
    [2026-05-06 23:11:17] [store_path] Resolving application handle
    [2026-05-06 23:11:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:17] [load] Reading file content
    [2026-05-06 23:11:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:22] [load] Starting to load store
    [2026-05-06 23:11:22] [store_path] Resolving application handle
    [2026-05-06 23:11:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:22] [load] Reading file content
    [2026-05-06 23:11:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:22] [load] Starting to load store
    [2026-05-06 23:11:22] [store_path] Resolving application handle
    [2026-05-06 23:11:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:22] [load] Reading file content
    [2026-05-06 23:11:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:27] [load] Starting to load store
    [2026-05-06 23:11:27] [store_path] Resolving application handle
    [2026-05-06 23:11:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:27] [load] Reading file content
    [2026-05-06 23:11:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:27] [load] Starting to load store
    [2026-05-06 23:11:27] [store_path] Resolving application handle
    [2026-05-06 23:11:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:27] [load] Reading file content
    [2026-05-06 23:11:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:32] [load] Starting to load store
    [2026-05-06 23:11:32] [store_path] Resolving application handle
    [2026-05-06 23:11:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:32] [load] Reading file content
    [2026-05-06 23:11:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:32] [load] Starting to load store
    [2026-05-06 23:11:32] [store_path] Resolving application handle
    [2026-05-06 23:11:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:32] [load] Reading file content
    [2026-05-06 23:11:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:37] [load] Starting to load store
    [2026-05-06 23:11:37] [store_path] Resolving application handle
    [2026-05-06 23:11:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:37] [load] Reading file content
    [2026-05-06 23:11:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:37] [load] Starting to load store
    [2026-05-06 23:11:37] [store_path] Resolving application handle
    [2026-05-06 23:11:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:37] [load] Reading file content
    [2026-05-06 23:11:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:42] [load] Starting to load store
    [2026-05-06 23:11:42] [store_path] Resolving application handle
    [2026-05-06 23:11:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:42] [load] Reading file content
    [2026-05-06 23:11:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:42] [load] Starting to load store
    [2026-05-06 23:11:42] [store_path] Resolving application handle
    [2026-05-06 23:11:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:42] [load] Reading file content
    [2026-05-06 23:11:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:47] [load] Starting to load store
    [2026-05-06 23:11:47] [store_path] Resolving application handle
    [2026-05-06 23:11:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:47] [load] Reading file content
    [2026-05-06 23:11:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:47] [load] Starting to load store
    [2026-05-06 23:11:47] [store_path] Resolving application handle
    [2026-05-06 23:11:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:47] [load] Reading file content
    [2026-05-06 23:11:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:52] [load] Starting to load store
    [2026-05-06 23:11:52] [store_path] Resolving application handle
    [2026-05-06 23:11:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:52] [load] Reading file content
    [2026-05-06 23:11:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:52] [load] Starting to load store
    [2026-05-06 23:11:52] [store_path] Resolving application handle
    [2026-05-06 23:11:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:52] [load] Reading file content
    [2026-05-06 23:11:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:11:57] [load] Starting to load store
    [2026-05-06 23:11:57] [store_path] Resolving application handle
    [2026-05-06 23:11:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:57] [load] Reading file content
    [2026-05-06 23:11:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:11:57] [load] Starting to load store
    [2026-05-06 23:11:57] [store_path] Resolving application handle
    [2026-05-06 23:11:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:11:57] [load] Reading file content
    [2026-05-06 23:11:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:11:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:02] [load] Starting to load store
    [2026-05-06 23:12:02] [store_path] Resolving application handle
    [2026-05-06 23:12:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:02] [load] Reading file content
    [2026-05-06 23:12:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:02] [load] Starting to load store
    [2026-05-06 23:12:02] [store_path] Resolving application handle
    [2026-05-06 23:12:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:02] [load] Reading file content
    [2026-05-06 23:12:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:07] [load] Starting to load store
    [2026-05-06 23:12:07] [store_path] Resolving application handle
    [2026-05-06 23:12:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:07] [load] Reading file content
    [2026-05-06 23:12:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:07] [load] Starting to load store
    [2026-05-06 23:12:07] [store_path] Resolving application handle
    [2026-05-06 23:12:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:07] [load] Reading file content
    [2026-05-06 23:12:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:12] [load] Starting to load store
    [2026-05-06 23:12:12] [store_path] Resolving application handle
    [2026-05-06 23:12:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:12] [load] Reading file content
    [2026-05-06 23:12:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:12] [load] Starting to load store
    [2026-05-06 23:12:12] [store_path] Resolving application handle
    [2026-05-06 23:12:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:12] [load] Reading file content
    [2026-05-06 23:12:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:17] [load] Starting to load store
    [2026-05-06 23:12:17] [store_path] Resolving application handle
    [2026-05-06 23:12:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:17] [load] Reading file content
    [2026-05-06 23:12:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:17] [load] Starting to load store
    [2026-05-06 23:12:17] [store_path] Resolving application handle
    [2026-05-06 23:12:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:17] [load] Reading file content
    [2026-05-06 23:12:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:22] [load] Starting to load store
    [2026-05-06 23:12:22] [store_path] Resolving application handle
    [2026-05-06 23:12:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:22] [load] Reading file content
    [2026-05-06 23:12:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:22] [load] Starting to load store
    [2026-05-06 23:12:22] [store_path] Resolving application handle
    [2026-05-06 23:12:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:22] [load] Reading file content
    [2026-05-06 23:12:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:27] [load] Starting to load store
    [2026-05-06 23:12:27] [store_path] Resolving application handle
    [2026-05-06 23:12:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:27] [load] Reading file content
    [2026-05-06 23:12:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:27] [load] Starting to load store
    [2026-05-06 23:12:27] [store_path] Resolving application handle
    [2026-05-06 23:12:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:27] [load] Reading file content
    [2026-05-06 23:12:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:32] [load] Starting to load store
    [2026-05-06 23:12:32] [store_path] Resolving application handle
    [2026-05-06 23:12:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:32] [load] Reading file content
    [2026-05-06 23:12:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:32] [load] Starting to load store
    [2026-05-06 23:12:32] [store_path] Resolving application handle
    [2026-05-06 23:12:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:32] [load] Reading file content
    [2026-05-06 23:12:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:37] [load] Starting to load store
    [2026-05-06 23:12:37] [store_path] Resolving application handle
    [2026-05-06 23:12:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:37] [load] Reading file content
    [2026-05-06 23:12:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:37] [load] Starting to load store
    [2026-05-06 23:12:37] [store_path] Resolving application handle
    [2026-05-06 23:12:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:37] [load] Reading file content
    [2026-05-06 23:12:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:42] [load] Starting to load store
    [2026-05-06 23:12:42] [store_path] Resolving application handle
    [2026-05-06 23:12:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:42] [load] Reading file content
    [2026-05-06 23:12:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:42] [load] Starting to load store
    [2026-05-06 23:12:42] [store_path] Resolving application handle
    [2026-05-06 23:12:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:42] [load] Reading file content
    [2026-05-06 23:12:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:47] [load] Starting to load store
    [2026-05-06 23:12:47] [store_path] Resolving application handle
    [2026-05-06 23:12:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:47] [load] Reading file content
    [2026-05-06 23:12:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:47] [load] Starting to load store
    [2026-05-06 23:12:47] [store_path] Resolving application handle
    [2026-05-06 23:12:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:47] [load] Reading file content
    [2026-05-06 23:12:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:52] [load] Starting to load store
    [2026-05-06 23:12:52] [store_path] Resolving application handle
    [2026-05-06 23:12:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:52] [load] Reading file content
    [2026-05-06 23:12:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:52] [load] Starting to load store
    [2026-05-06 23:12:52] [store_path] Resolving application handle
    [2026-05-06 23:12:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:52] [load] Reading file content
    [2026-05-06 23:12:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:12:57] [load] Starting to load store
    [2026-05-06 23:12:57] [store_path] Resolving application handle
    [2026-05-06 23:12:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:57] [load] Reading file content
    [2026-05-06 23:12:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:12:57] [load] Starting to load store
    [2026-05-06 23:12:57] [store_path] Resolving application handle
    [2026-05-06 23:12:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:12:57] [load] Reading file content
    [2026-05-06 23:12:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:12:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:02] [load] Starting to load store
    [2026-05-06 23:13:02] [store_path] Resolving application handle
    [2026-05-06 23:13:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:02] [load] Reading file content
    [2026-05-06 23:13:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:02] [load] Starting to load store
    [2026-05-06 23:13:02] [store_path] Resolving application handle
    [2026-05-06 23:13:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:02] [load] Reading file content
    [2026-05-06 23:13:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:07] [load] Starting to load store
    [2026-05-06 23:13:07] [store_path] Resolving application handle
    [2026-05-06 23:13:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:07] [load] Reading file content
    [2026-05-06 23:13:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:07] [load] Starting to load store
    [2026-05-06 23:13:07] [store_path] Resolving application handle
    [2026-05-06 23:13:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:07] [load] Reading file content
    [2026-05-06 23:13:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:12] [load] Starting to load store
    [2026-05-06 23:13:12] [store_path] Resolving application handle
    [2026-05-06 23:13:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:12] [load] Reading file content
    [2026-05-06 23:13:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:12] [load] Starting to load store
    [2026-05-06 23:13:12] [store_path] Resolving application handle
    [2026-05-06 23:13:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:12] [load] Reading file content
    [2026-05-06 23:13:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:17] [load] Starting to load store
    [2026-05-06 23:13:17] [store_path] Resolving application handle
    [2026-05-06 23:13:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:17] [load] Reading file content
    [2026-05-06 23:13:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:17] [load] Starting to load store
    [2026-05-06 23:13:17] [store_path] Resolving application handle
    [2026-05-06 23:13:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:17] [load] Reading file content
    [2026-05-06 23:13:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:22] [load] Starting to load store
    [2026-05-06 23:13:22] [store_path] Resolving application handle
    [2026-05-06 23:13:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:22] [load] Reading file content
    [2026-05-06 23:13:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:22] [load] Starting to load store
    [2026-05-06 23:13:22] [store_path] Resolving application handle
    [2026-05-06 23:13:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:22] [load] Reading file content
    [2026-05-06 23:13:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:27] [load] Starting to load store
    [2026-05-06 23:13:27] [store_path] Resolving application handle
    [2026-05-06 23:13:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:27] [load] Reading file content
    [2026-05-06 23:13:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:27] [load] Starting to load store
    [2026-05-06 23:13:27] [store_path] Resolving application handle
    [2026-05-06 23:13:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:27] [load] Reading file content
    [2026-05-06 23:13:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:28] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:33] [load] Starting to load store
    [2026-05-06 23:13:33] [store_path] Resolving application handle
    [2026-05-06 23:13:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:33] [load] Reading file content
    [2026-05-06 23:13:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:33] [load] Starting to load store
    [2026-05-06 23:13:33] [store_path] Resolving application handle
    [2026-05-06 23:13:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:33] [load] Reading file content
    [2026-05-06 23:13:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:37] [load] Starting to load store
    [2026-05-06 23:13:37] [store_path] Resolving application handle
    [2026-05-06 23:13:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:37] [load] Reading file content
    [2026-05-06 23:13:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:37] [load] Starting to load store
    [2026-05-06 23:13:37] [store_path] Resolving application handle
    [2026-05-06 23:13:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:37] [load] Reading file content
    [2026-05-06 23:13:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:42] [load] Starting to load store
    [2026-05-06 23:13:42] [store_path] Resolving application handle
    [2026-05-06 23:13:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:42] [load] Reading file content
    [2026-05-06 23:13:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:42] [load] Starting to load store
    [2026-05-06 23:13:42] [store_path] Resolving application handle
    [2026-05-06 23:13:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:42] [load] Reading file content
    [2026-05-06 23:13:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:47] [load] Starting to load store
    [2026-05-06 23:13:47] [store_path] Resolving application handle
    [2026-05-06 23:13:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:47] [load] Reading file content
    [2026-05-06 23:13:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:47] [load] Starting to load store
    [2026-05-06 23:13:47] [store_path] Resolving application handle
    [2026-05-06 23:13:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:47] [load] Reading file content
    [2026-05-06 23:13:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:52] [load] Starting to load store
    [2026-05-06 23:13:52] [store_path] Resolving application handle
    [2026-05-06 23:13:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:52] [load] Reading file content
    [2026-05-06 23:13:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:52] [load] Starting to load store
    [2026-05-06 23:13:52] [store_path] Resolving application handle
    [2026-05-06 23:13:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:52] [load] Reading file content
    [2026-05-06 23:13:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:13:57] [load] Starting to load store
    [2026-05-06 23:13:57] [store_path] Resolving application handle
    [2026-05-06 23:13:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:57] [load] Reading file content
    [2026-05-06 23:13:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:13:57] [load] Starting to load store
    [2026-05-06 23:13:57] [store_path] Resolving application handle
    [2026-05-06 23:13:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:13:57] [load] Reading file content
    [2026-05-06 23:13:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:13:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:02] [load] Starting to load store
    [2026-05-06 23:14:02] [store_path] Resolving application handle
    [2026-05-06 23:14:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:02] [load] Reading file content
    [2026-05-06 23:14:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:02] [load] Starting to load store
    [2026-05-06 23:14:02] [store_path] Resolving application handle
    [2026-05-06 23:14:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:02] [load] Reading file content
    [2026-05-06 23:14:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:07] [load] Starting to load store
    [2026-05-06 23:14:07] [store_path] Resolving application handle
    [2026-05-06 23:14:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:07] [load] Reading file content
    [2026-05-06 23:14:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:07] [load] Starting to load store
    [2026-05-06 23:14:07] [store_path] Resolving application handle
    [2026-05-06 23:14:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:07] [load] Reading file content
    [2026-05-06 23:14:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:12] [load] Starting to load store
    [2026-05-06 23:14:12] [store_path] Resolving application handle
    [2026-05-06 23:14:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:12] [load] Reading file content
    [2026-05-06 23:14:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:12] [load] Starting to load store
    [2026-05-06 23:14:12] [store_path] Resolving application handle
    [2026-05-06 23:14:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:12] [load] Reading file content
    [2026-05-06 23:14:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:17] [load] Starting to load store
    [2026-05-06 23:14:17] [store_path] Resolving application handle
    [2026-05-06 23:14:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:17] [load] Reading file content
    [2026-05-06 23:14:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:17] [load] Starting to load store
    [2026-05-06 23:14:17] [store_path] Resolving application handle
    [2026-05-06 23:14:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:17] [load] Reading file content
    [2026-05-06 23:14:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:22] [load] Starting to load store
    [2026-05-06 23:14:22] [store_path] Resolving application handle
    [2026-05-06 23:14:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:22] [load] Reading file content
    [2026-05-06 23:14:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:22] [load] Starting to load store
    [2026-05-06 23:14:22] [store_path] Resolving application handle
    [2026-05-06 23:14:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:22] [load] Reading file content
    [2026-05-06 23:14:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:27] [load] Starting to load store
    [2026-05-06 23:14:27] [store_path] Resolving application handle
    [2026-05-06 23:14:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:27] [load] Reading file content
    [2026-05-06 23:14:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:27] [load] Starting to load store
    [2026-05-06 23:14:27] [store_path] Resolving application handle
    [2026-05-06 23:14:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:27] [load] Reading file content
    [2026-05-06 23:14:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:32] [load] Starting to load store
    [2026-05-06 23:14:32] [store_path] Resolving application handle
    [2026-05-06 23:14:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:32] [load] Reading file content
    [2026-05-06 23:14:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:32] [load] Starting to load store
    [2026-05-06 23:14:32] [store_path] Resolving application handle
    [2026-05-06 23:14:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:32] [load] Reading file content
    [2026-05-06 23:14:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:37] [load] Starting to load store
    [2026-05-06 23:14:37] [store_path] Resolving application handle
    [2026-05-06 23:14:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:37] [load] Reading file content
    [2026-05-06 23:14:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:37] [load] Starting to load store
    [2026-05-06 23:14:37] [store_path] Resolving application handle
    [2026-05-06 23:14:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:37] [load] Reading file content
    [2026-05-06 23:14:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:42] [load] Starting to load store
    [2026-05-06 23:14:42] [store_path] Resolving application handle
    [2026-05-06 23:14:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:42] [load] Reading file content
    [2026-05-06 23:14:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:42] [load] Starting to load store
    [2026-05-06 23:14:42] [store_path] Resolving application handle
    [2026-05-06 23:14:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:42] [load] Reading file content
    [2026-05-06 23:14:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:47] [load] Starting to load store
    [2026-05-06 23:14:47] [store_path] Resolving application handle
    [2026-05-06 23:14:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:47] [load] Reading file content
    [2026-05-06 23:14:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:47] [load] Starting to load store
    [2026-05-06 23:14:47] [store_path] Resolving application handle
    [2026-05-06 23:14:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:47] [load] Reading file content
    [2026-05-06 23:14:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:52] [load] Starting to load store
    [2026-05-06 23:14:52] [store_path] Resolving application handle
    [2026-05-06 23:14:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:52] [load] Reading file content
    [2026-05-06 23:14:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:52] [load] Starting to load store
    [2026-05-06 23:14:52] [store_path] Resolving application handle
    [2026-05-06 23:14:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:52] [load] Reading file content
    [2026-05-06 23:14:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:14:57] [load] Starting to load store
    [2026-05-06 23:14:57] [store_path] Resolving application handle
    [2026-05-06 23:14:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:57] [load] Reading file content
    [2026-05-06 23:14:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:14:57] [load] Starting to load store
    [2026-05-06 23:14:57] [store_path] Resolving application handle
    [2026-05-06 23:14:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:14:57] [load] Reading file content
    [2026-05-06 23:14:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:14:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:02] [load] Starting to load store
    [2026-05-06 23:15:02] [store_path] Resolving application handle
    [2026-05-06 23:15:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:02] [load] Reading file content
    [2026-05-06 23:15:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:02] [load] Starting to load store
    [2026-05-06 23:15:02] [store_path] Resolving application handle
    [2026-05-06 23:15:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:02] [load] Reading file content
    [2026-05-06 23:15:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:07] [load] Starting to load store
    [2026-05-06 23:15:07] [store_path] Resolving application handle
    [2026-05-06 23:15:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:07] [load] Reading file content
    [2026-05-06 23:15:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:07] [load] Starting to load store
    [2026-05-06 23:15:07] [store_path] Resolving application handle
    [2026-05-06 23:15:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:07] [load] Reading file content
    [2026-05-06 23:15:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:12] [load] Starting to load store
    [2026-05-06 23:15:12] [store_path] Resolving application handle
    [2026-05-06 23:15:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:12] [load] Reading file content
    [2026-05-06 23:15:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:12] [load] Starting to load store
    [2026-05-06 23:15:12] [store_path] Resolving application handle
    [2026-05-06 23:15:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:12] [load] Reading file content
    [2026-05-06 23:15:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:17] [load] Starting to load store
    [2026-05-06 23:15:17] [store_path] Resolving application handle
    [2026-05-06 23:15:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:17] [load] Reading file content
    [2026-05-06 23:15:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:17] [load] Starting to load store
    [2026-05-06 23:15:17] [store_path] Resolving application handle
    [2026-05-06 23:15:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:17] [load] Reading file content
    [2026-05-06 23:15:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:22] [load] Starting to load store
    [2026-05-06 23:15:22] [store_path] Resolving application handle
    [2026-05-06 23:15:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:22] [load] Reading file content
    [2026-05-06 23:15:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:22] [load] Starting to load store
    [2026-05-06 23:15:22] [store_path] Resolving application handle
    [2026-05-06 23:15:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:22] [load] Reading file content
    [2026-05-06 23:15:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:27] [load] Starting to load store
    [2026-05-06 23:15:27] [store_path] Resolving application handle
    [2026-05-06 23:15:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:27] [load] Reading file content
    [2026-05-06 23:15:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:27] [load] Starting to load store
    [2026-05-06 23:15:27] [store_path] Resolving application handle
    [2026-05-06 23:15:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:27] [load] Reading file content
    [2026-05-06 23:15:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:32] [load] Starting to load store
    [2026-05-06 23:15:32] [store_path] Resolving application handle
    [2026-05-06 23:15:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:32] [load] Reading file content
    [2026-05-06 23:15:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:32] [load] Starting to load store
    [2026-05-06 23:15:32] [store_path] Resolving application handle
    [2026-05-06 23:15:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:32] [load] Reading file content
    [2026-05-06 23:15:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:38] [load] Starting to load store
    [2026-05-06 23:15:38] [store_path] Resolving application handle
    [2026-05-06 23:15:38] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:38] [load] Reading file content
    [2026-05-06 23:15:38] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:38] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:38] [load] Starting to load store
    [2026-05-06 23:15:38] [store_path] Resolving application handle
    [2026-05-06 23:15:38] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:38] [load] Reading file content
    [2026-05-06 23:15:38] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:38] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:42] [load] Starting to load store
    [2026-05-06 23:15:42] [store_path] Resolving application handle
    [2026-05-06 23:15:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:42] [load] Reading file content
    [2026-05-06 23:15:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:43] [load] Starting to load store
    [2026-05-06 23:15:43] [store_path] Resolving application handle
    [2026-05-06 23:15:43] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:43] [load] Reading file content
    [2026-05-06 23:15:43] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:43] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:47] [load] Starting to load store
    [2026-05-06 23:15:47] [store_path] Resolving application handle
    [2026-05-06 23:15:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:47] [load] Reading file content
    [2026-05-06 23:15:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:47] [load] Starting to load store
    [2026-05-06 23:15:47] [store_path] Resolving application handle
    [2026-05-06 23:15:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:47] [load] Reading file content
    [2026-05-06 23:15:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:52] [load] Starting to load store
    [2026-05-06 23:15:52] [store_path] Resolving application handle
    [2026-05-06 23:15:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:52] [load] Reading file content
    [2026-05-06 23:15:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:52] [load] Starting to load store
    [2026-05-06 23:15:52] [store_path] Resolving application handle
    [2026-05-06 23:15:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:52] [load] Reading file content
    [2026-05-06 23:15:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:15:57] [load] Starting to load store
    [2026-05-06 23:15:57] [store_path] Resolving application handle
    [2026-05-06 23:15:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:57] [load] Reading file content
    [2026-05-06 23:15:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:15:57] [load] Starting to load store
    [2026-05-06 23:15:57] [store_path] Resolving application handle
    [2026-05-06 23:15:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:15:57] [load] Reading file content
    [2026-05-06 23:15:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:15:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:02] [load] Starting to load store
    [2026-05-06 23:16:02] [store_path] Resolving application handle
    [2026-05-06 23:16:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:02] [load] Reading file content
    [2026-05-06 23:16:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:02] [load] Starting to load store
    [2026-05-06 23:16:02] [store_path] Resolving application handle
    [2026-05-06 23:16:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:02] [load] Reading file content
    [2026-05-06 23:16:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:07] [load] Starting to load store
    [2026-05-06 23:16:07] [store_path] Resolving application handle
    [2026-05-06 23:16:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:07] [load] Reading file content
    [2026-05-06 23:16:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:07] [load] Starting to load store
    [2026-05-06 23:16:07] [store_path] Resolving application handle
    [2026-05-06 23:16:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:07] [load] Reading file content
    [2026-05-06 23:16:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:12] [load] Starting to load store
    [2026-05-06 23:16:12] [store_path] Resolving application handle
    [2026-05-06 23:16:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:12] [load] Reading file content
    [2026-05-06 23:16:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:12] [load] Starting to load store
    [2026-05-06 23:16:12] [store_path] Resolving application handle
    [2026-05-06 23:16:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:12] [load] Reading file content
    [2026-05-06 23:16:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:17] [load] Starting to load store
    [2026-05-06 23:16:17] [store_path] Resolving application handle
    [2026-05-06 23:16:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:17] [load] Reading file content
    [2026-05-06 23:16:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:17] [load] Starting to load store
    [2026-05-06 23:16:17] [store_path] Resolving application handle
    [2026-05-06 23:16:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:17] [load] Reading file content
    [2026-05-06 23:16:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:22] [load] Starting to load store
    [2026-05-06 23:16:22] [store_path] Resolving application handle
    [2026-05-06 23:16:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:22] [load] Reading file content
    [2026-05-06 23:16:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:22] [load] Starting to load store
    [2026-05-06 23:16:22] [store_path] Resolving application handle
    [2026-05-06 23:16:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:22] [load] Reading file content
    [2026-05-06 23:16:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:27] [load] Starting to load store
    [2026-05-06 23:16:27] [store_path] Resolving application handle
    [2026-05-06 23:16:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:27] [load] Reading file content
    [2026-05-06 23:16:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:27] [load] Starting to load store
    [2026-05-06 23:16:27] [store_path] Resolving application handle
    [2026-05-06 23:16:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:27] [load] Reading file content
    [2026-05-06 23:16:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:32] [load] Starting to load store
    [2026-05-06 23:16:32] [store_path] Resolving application handle
    [2026-05-06 23:16:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:32] [load] Reading file content
    [2026-05-06 23:16:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:32] [load] Starting to load store
    [2026-05-06 23:16:32] [store_path] Resolving application handle
    [2026-05-06 23:16:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:32] [load] Reading file content
    [2026-05-06 23:16:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:37] [load] Starting to load store
    [2026-05-06 23:16:37] [store_path] Resolving application handle
    [2026-05-06 23:16:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:37] [load] Reading file content
    [2026-05-06 23:16:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:37] [load] Starting to load store
    [2026-05-06 23:16:37] [store_path] Resolving application handle
    [2026-05-06 23:16:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:37] [load] Reading file content
    [2026-05-06 23:16:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:42] [load] Starting to load store
    [2026-05-06 23:16:42] [store_path] Resolving application handle
    [2026-05-06 23:16:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:42] [load] Reading file content
    [2026-05-06 23:16:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:42] [load] Starting to load store
    [2026-05-06 23:16:42] [store_path] Resolving application handle
    [2026-05-06 23:16:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:42] [load] Reading file content
    [2026-05-06 23:16:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:47] [load] Starting to load store
    [2026-05-06 23:16:47] [store_path] Resolving application handle
    [2026-05-06 23:16:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:47] [load] Reading file content
    [2026-05-06 23:16:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:47] [load] Starting to load store
    [2026-05-06 23:16:47] [store_path] Resolving application handle
    [2026-05-06 23:16:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:47] [load] Reading file content
    [2026-05-06 23:16:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:54] [load] Starting to load store
    [2026-05-06 23:16:54] [store_path] Resolving application handle
    [2026-05-06 23:16:54] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:54] [load] Reading file content
    [2026-05-06 23:16:54] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:54] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:54] [load] Starting to load store
    [2026-05-06 23:16:54] [store_path] Resolving application handle
    [2026-05-06 23:16:54] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:54] [load] Reading file content
    [2026-05-06 23:16:54] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:54] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:16:58] [load] Starting to load store
    [2026-05-06 23:16:58] [store_path] Resolving application handle
    [2026-05-06 23:16:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:58] [load] Reading file content
    [2026-05-06 23:16:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:16:58] [load] Starting to load store
    [2026-05-06 23:16:58] [store_path] Resolving application handle
    [2026-05-06 23:16:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:16:58] [load] Reading file content
    [2026-05-06 23:16:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:16:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:17:02] [load] Starting to load store
    [2026-05-06 23:17:02] [store_path] Resolving application handle
    [2026-05-06 23:17:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:02] [load] Reading file content
    [2026-05-06 23:17:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:02] [load] Starting to load store
    [2026-05-06 23:17:02] [store_path] Resolving application handle
    [2026-05-06 23:17:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:02] [load] Reading file content
    [2026-05-06 23:17:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:17:07] [load] Starting to load store
    [2026-05-06 23:17:07] [store_path] Resolving application handle
    [2026-05-06 23:17:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:07] [load] Reading file content
    [2026-05-06 23:17:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:07] [load] Starting to load store
    [2026-05-06 23:17:07] [store_path] Resolving application handle
    [2026-05-06 23:17:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:07] [load] Reading file content
    [2026-05-06 23:17:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:17:21] [load] Starting to load store
    [2026-05-06 23:17:21] [store_path] Resolving application handle
    [2026-05-06 23:17:21] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:21] [load] Reading file content
    [2026-05-06 23:17:21] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:21] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:17:21] [load] Starting to load store
    [2026-05-06 23:17:21] [store_path] Resolving application handle
    [2026-05-06 23:17:21] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:21] [load] Reading file content
    [2026-05-06 23:17:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:22] [load] Starting to load store
    [2026-05-06 23:17:22] [store_path] Resolving application handle
    [2026-05-06 23:17:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:22] [load] Reading file content
    [2026-05-06 23:17:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:33] [load] Starting to load store
    [2026-05-06 23:17:33] [store_path] Resolving application handle
    [2026-05-06 23:17:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:33] [load] Reading file content
    [2026-05-06 23:17:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:45] [load] Starting to load store
    [2026-05-06 23:17:45] [store_path] Resolving application handle
    [2026-05-06 23:17:45] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:45] [load] Reading file content
    [2026-05-06 23:17:45] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:45] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:49] [load] Starting to load store
    [2026-05-06 23:17:49] [store_path] Resolving application handle
    [2026-05-06 23:17:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:49] [load] Reading file content
    [2026-05-06 23:17:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:49] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:17:56] [load] Starting to load store
    [2026-05-06 23:17:56] [store_path] Resolving application handle
    [2026-05-06 23:17:56] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:17:56] [load] Reading file content
    [2026-05-06 23:17:56] [load] File read successfully (578 bytes)
    [2026-05-06 23:17:56] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:01] [load] Starting to load store
    [2026-05-06 23:18:01] [store_path] Resolving application handle
    [2026-05-06 23:18:01] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:01] [load] Reading file content
    [2026-05-06 23:18:01] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:01] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:10] [load] Starting to load store
    [2026-05-06 23:18:10] [store_path] Resolving application handle
    [2026-05-06 23:18:10] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:10] [load] Reading file content
    [2026-05-06 23:18:10] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:10] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:17] [load] Starting to load store
    [2026-05-06 23:18:17] [store_path] Resolving application handle
    [2026-05-06 23:18:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:17] [load] Reading file content
    [2026-05-06 23:18:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:22] [load] Starting to load store
    [2026-05-06 23:18:22] [store_path] Resolving application handle
    [2026-05-06 23:18:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:22] [load] Reading file content
    [2026-05-06 23:18:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:29] [load] Starting to load store
    [2026-05-06 23:18:29] [store_path] Resolving application handle
    [2026-05-06 23:18:29] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:29] [load] Reading file content
    [2026-05-06 23:18:29] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:29] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:48] [load] Starting to load store
    [2026-05-06 23:18:48] [store_path] Resolving application handle
    [2026-05-06 23:18:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:48] [load] Reading file content
    [2026-05-06 23:18:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:18:56] [load] Starting to load store
    [2026-05-06 23:18:56] [store_path] Resolving application handle
    [2026-05-06 23:18:56] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:18:56] [load] Reading file content
    [2026-05-06 23:18:56] [load] File read successfully (578 bytes)
    [2026-05-06 23:18:56] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:02] [load] Starting to load store
    [2026-05-06 23:19:02] [store_path] Resolving application handle
    [2026-05-06 23:19:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:02] [load] Reading file content
    [2026-05-06 23:19:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:07] [load] Starting to load store
    [2026-05-06 23:19:07] [store_path] Resolving application handle
    [2026-05-06 23:19:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:07] [load] Reading file content
    [2026-05-06 23:19:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:15] [load] Starting to load store
    [2026-05-06 23:19:15] [store_path] Resolving application handle
    [2026-05-06 23:19:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:15] [load] Reading file content
    [2026-05-06 23:19:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:15] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:16] [load] Starting to load store
    [2026-05-06 23:19:16] [store_path] Resolving application handle
    [2026-05-06 23:19:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:16] [load] Reading file content
    [2026-05-06 23:19:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:16] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:21] [load] Starting to load store
    [2026-05-06 23:19:21] [store_path] Resolving application handle
    [2026-05-06 23:19:21] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:21] [load] Reading file content
    [2026-05-06 23:19:21] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:21] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:24] [load] Starting to load store
    [2026-05-06 23:19:24] [store_path] Resolving application handle
    [2026-05-06 23:19:24] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:24] [load] Reading file content
    [2026-05-06 23:19:24] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:24] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:27] [load] Starting to load store
    [2026-05-06 23:19:27] [store_path] Resolving application handle
    [2026-05-06 23:19:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:27] [load] Reading file content
    [2026-05-06 23:19:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:31] [load] Starting to load store
    [2026-05-06 23:19:31] [store_path] Resolving application handle
    [2026-05-06 23:19:31] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:31] [load] Reading file content
    [2026-05-06 23:19:31] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:31] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:33] [load] Starting to load store
    [2026-05-06 23:19:33] [store_path] Resolving application handle
    [2026-05-06 23:19:34] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:34] [load] Reading file content
    [2026-05-06 23:19:34] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:34] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:36] [load] Starting to load store
    [2026-05-06 23:19:36] [store_path] Resolving application handle
    [2026-05-06 23:19:36] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:36] [load] Reading file content
    [2026-05-06 23:19:36] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:36] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:39] [load] Starting to load store
    [2026-05-06 23:19:39] [store_path] Resolving application handle
    [2026-05-06 23:19:39] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:39] [load] Reading file content
    [2026-05-06 23:19:39] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:39] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:41] [load] Starting to load store
    [2026-05-06 23:19:41] [store_path] Resolving application handle
    [2026-05-06 23:19:41] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:41] [load] Reading file content
    [2026-05-06 23:19:41] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:41] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:47] [load] Starting to load store
    [2026-05-06 23:19:47] [store_path] Resolving application handle
    [2026-05-06 23:19:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:47] [load] Reading file content
    [2026-05-06 23:19:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:55] [load] Starting to load store
    [2026-05-06 23:19:55] [store_path] Resolving application handle
    [2026-05-06 23:19:55] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:55] [load] Reading file content
    [2026-05-06 23:19:55] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:55] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:57] [load] Reading file content
    [2026-05-06 23:19:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:57] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:57] [load] Reading file content
    [2026-05-06 23:19:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:57] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:57] [load] Reading file content
    [2026-05-06 23:19:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:57] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:57] [load] Reading file content
    [2026-05-06 23:19:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:57] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:57] [load] Reading file content
    [2026-05-06 23:19:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:57] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:57] [load] Starting to load store
    [2026-05-06 23:19:57] [store_path] Resolving application handle
    [2026-05-06 23:19:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:58] [load] Reading file content
    [2026-05-06 23:19:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:58] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:58] [load] Starting to load store
    [2026-05-06 23:19:58] [store_path] Resolving application handle
    [2026-05-06 23:19:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:58] [load] Reading file content
    [2026-05-06 23:19:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:58] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:58] [load] Starting to load store
    [2026-05-06 23:19:58] [store_path] Resolving application handle
    [2026-05-06 23:19:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:58] [load] Reading file content
    [2026-05-06 23:19:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:58] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:19:58] [load] Starting to load store
    [2026-05-06 23:19:58] [store_path] Resolving application handle
    [2026-05-06 23:19:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:58] [load] Reading file content
    [2026-05-06 23:19:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:19:58] [load] Starting to load store
    [2026-05-06 23:19:58] [store_path] Resolving application handle
    [2026-05-06 23:19:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:19:58] [load] Reading file content
    [2026-05-06 23:19:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:19:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:03] [load] Starting to load store
    [2026-05-06 23:20:03] [store_path] Resolving application handle
    [2026-05-06 23:20:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:03] [load] Reading file content
    [2026-05-06 23:20:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:03] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:05] [load] Starting to load store
    [2026-05-06 23:20:05] [store_path] Resolving application handle
    [2026-05-06 23:20:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:05] [load] Reading file content
    [2026-05-06 23:20:05] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:05] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:08] [load] Starting to load store
    [2026-05-06 23:20:08] [store_path] Resolving application handle
    [2026-05-06 23:20:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:08] [load] Reading file content
    [2026-05-06 23:20:08] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:13] [load] Starting to load store
    [2026-05-06 23:20:13] [store_path] Resolving application handle
    [2026-05-06 23:20:13] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:13] [load] Reading file content
    [2026-05-06 23:20:13] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:13] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:20] [load] Starting to load store
    [2026-05-06 23:20:20] [store_path] Resolving application handle
    [2026-05-06 23:20:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:20] [load] Reading file content
    [2026-05-06 23:20:20] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:34] [load] Starting to load store
    [2026-05-06 23:20:34] [store_path] Resolving application handle
    [2026-05-06 23:20:34] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:34] [load] Reading file content
    [2026-05-06 23:20:34] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:34] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:47] [load] Starting to load store
    [2026-05-06 23:20:47] [store_path] Resolving application handle
    [2026-05-06 23:20:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:47] [load] Reading file content
    [2026-05-06 23:20:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:20:54] [load] Starting to load store
    [2026-05-06 23:20:54] [store_path] Resolving application handle
    [2026-05-06 23:20:54] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:20:54] [load] Reading file content
    [2026-05-06 23:20:54] [load] File read successfully (578 bytes)
    [2026-05-06 23:20:54] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:02] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:02] [load] Starting to load store
    [2026-05-06 23:21:02] [store_path] Resolving application handle
    [2026-05-06 23:21:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:02] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:03] [load] Starting to load store
    [2026-05-06 23:21:03] [store_path] Resolving application handle
    [2026-05-06 23:21:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:03] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:03] [load] Starting to load store
    [2026-05-06 23:21:03] [store_path] Resolving application handle
    [2026-05-06 23:21:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:03] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:03] [load] Starting to load store
    [2026-05-06 23:21:03] [store_path] Resolving application handle
    [2026-05-06 23:21:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:03] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:03] [load] Starting to load store
    [2026-05-06 23:21:03] [store_path] Resolving application handle
    [2026-05-06 23:21:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:03] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:03] [load] Starting to load store
    [2026-05-06 23:21:03] [store_path] Resolving application handle
    [2026-05-06 23:21:03] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:03] [load] Reading file content
    [2026-05-06 23:21:03] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:03] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:05] [load] Starting to load store
    [2026-05-06 23:21:05] [store_path] Resolving application handle
    [2026-05-06 23:21:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:05] [load] Reading file content
    [2026-05-06 23:21:05] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:05] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:08] [load] Starting to load store
    [2026-05-06 23:21:08] [store_path] Resolving application handle
    [2026-05-06 23:21:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:08] [load] Reading file content
    [2026-05-06 23:21:08] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:13] [load] Starting to load store
    [2026-05-06 23:21:13] [store_path] Resolving application handle
    [2026-05-06 23:21:13] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:13] [load] Reading file content
    [2026-05-06 23:21:13] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:13] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:15] [load] Starting to load store
    [2026-05-06 23:21:15] [store_path] Resolving application handle
    [2026-05-06 23:21:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:15] [load] Reading file content
    [2026-05-06 23:21:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:21] [load] Starting to load store
    [2026-05-06 23:21:21] [store_path] Resolving application handle
    [2026-05-06 23:21:21] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:21] [load] Reading file content
    [2026-05-06 23:21:21] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:21] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:27] [load] Starting to load store
    [2026-05-06 23:21:27] [store_path] Resolving application handle
    [2026-05-06 23:21:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:27] [load] Reading file content
    [2026-05-06 23:21:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:30] [load] Starting to load store
    [2026-05-06 23:21:30] [store_path] Resolving application handle
    [2026-05-06 23:21:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:30] [load] Reading file content
    [2026-05-06 23:21:30] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:33] [load] Starting to load store
    [2026-05-06 23:21:33] [store_path] Resolving application handle
    [2026-05-06 23:21:33] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:33] [load] Reading file content
    [2026-05-06 23:21:33] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:33] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:35] [load] Starting to load store
    [2026-05-06 23:21:35] [store_path] Resolving application handle
    [2026-05-06 23:21:35] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:35] [load] Reading file content
    [2026-05-06 23:21:35] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:35] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:37] [load] Starting to load store
    [2026-05-06 23:21:37] [store_path] Resolving application handle
    [2026-05-06 23:21:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:37] [load] Reading file content
    [2026-05-06 23:21:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:43] [load] Starting to load store
    [2026-05-06 23:21:43] [store_path] Resolving application handle
    [2026-05-06 23:21:43] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:43] [load] Reading file content
    [2026-05-06 23:21:43] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:43] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:46] [load] Starting to load store
    [2026-05-06 23:21:46] [store_path] Resolving application handle
    [2026-05-06 23:21:46] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:46] [load] Reading file content
    [2026-05-06 23:21:46] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:46] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:48] [load] Starting to load store
    [2026-05-06 23:21:48] [store_path] Resolving application handle
    [2026-05-06 23:21:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:48] [load] Reading file content
    [2026-05-06 23:21:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:50] [load] Starting to load store
    [2026-05-06 23:21:50] [store_path] Resolving application handle
    [2026-05-06 23:21:50] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:50] [load] Reading file content
    [2026-05-06 23:21:50] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:50] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:52] [load] Starting to load store
    [2026-05-06 23:21:52] [store_path] Resolving application handle
    [2026-05-06 23:21:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:52] [load] Reading file content
    [2026-05-06 23:21:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:54] [load] Starting to load store
    [2026-05-06 23:21:54] [store_path] Resolving application handle
    [2026-05-06 23:21:54] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:54] [load] Reading file content
    [2026-05-06 23:21:54] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:54] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:56] [load] Starting to load store
    [2026-05-06 23:21:56] [store_path] Resolving application handle
    [2026-05-06 23:21:56] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:56] [load] Reading file content
    [2026-05-06 23:21:56] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:56] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:21:58] [load] Starting to load store
    [2026-05-06 23:21:58] [store_path] Resolving application handle
    [2026-05-06 23:21:58] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:21:58] [load] Reading file content
    [2026-05-06 23:21:58] [load] File read successfully (578 bytes)
    [2026-05-06 23:21:58] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:00] [load] Starting to load store
    [2026-05-06 23:22:00] [store_path] Resolving application handle
    [2026-05-06 23:22:00] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:00] [load] Reading file content
    [2026-05-06 23:22:00] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:00] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:02] [load] Starting to load store
    [2026-05-06 23:22:02] [store_path] Resolving application handle
    [2026-05-06 23:22:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:02] [load] Reading file content
    [2026-05-06 23:22:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:05] [load] Starting to load store
    [2026-05-06 23:22:05] [store_path] Resolving application handle
    [2026-05-06 23:22:05] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:05] [load] Reading file content
    [2026-05-06 23:22:05] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:05] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:07] [load] Starting to load store
    [2026-05-06 23:22:07] [store_path] Resolving application handle
    [2026-05-06 23:22:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:07] [load] Reading file content
    [2026-05-06 23:22:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:07] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:22:07] [load] Starting to load store
    [2026-05-06 23:22:07] [store_path] Resolving application handle
    [2026-05-06 23:22:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:07] [load] Reading file content
    [2026-05-06 23:22:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:07] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:22:07] [load] Starting to load store
    [2026-05-06 23:22:07] [store_path] Resolving application handle
    [2026-05-06 23:22:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:07] [load] Reading file content
    [2026-05-06 23:22:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:07] [load] Starting to load store
    [2026-05-06 23:22:07] [store_path] Resolving application handle
    [2026-05-06 23:22:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:07] [load] Reading file content
    [2026-05-06 23:22:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:10] [load] Starting to load store
    [2026-05-06 23:22:10] [store_path] Resolving application handle
    [2026-05-06 23:22:10] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:10] [load] Reading file content
    [2026-05-06 23:22:10] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:10] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:12] [load] Starting to load store
    [2026-05-06 23:22:12] [store_path] Resolving application handle
    [2026-05-06 23:22:12] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:12] [load] Reading file content
    [2026-05-06 23:22:12] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:12] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:14] [load] Starting to load store
    [2026-05-06 23:22:14] [store_path] Resolving application handle
    [2026-05-06 23:22:14] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:14] [load] Reading file content
    [2026-05-06 23:22:14] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:14] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:22:14] [load] Starting to load store
    [2026-05-06 23:22:14] [store_path] Resolving application handle
    [2026-05-06 23:22:14] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:14] [load] Reading file content
    [2026-05-06 23:22:14] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:14] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:14] [load] Starting to load store
    [2026-05-06 23:22:14] [store_path] Resolving application handle
    [2026-05-06 23:22:14] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:14] [load] Reading file content
    [2026-05-06 23:22:14] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:14] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:16] [load] Starting to load store
    [2026-05-06 23:22:16] [store_path] Resolving application handle
    [2026-05-06 23:22:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:16] [load] Reading file content
    [2026-05-06 23:22:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:16] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:17] [load] Starting to load store
    [2026-05-06 23:22:17] [store_path] Resolving application handle
    [2026-05-06 23:22:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:17] [load] Reading file content
    [2026-05-06 23:22:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:17] [load] Starting to load store
    [2026-05-06 23:22:17] [store_path] Resolving application handle
    [2026-05-06 23:22:17] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:17] [load] Reading file content
    [2026-05-06 23:22:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:22] [load] Starting to load store
    [2026-05-06 23:22:22] [store_path] Resolving application handle
    [2026-05-06 23:22:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:22] [load] Reading file content
    [2026-05-06 23:22:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:22] [load] Starting to load store
    [2026-05-06 23:22:22] [store_path] Resolving application handle
    [2026-05-06 23:22:22] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:22] [load] Reading file content
    [2026-05-06 23:22:22] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:22] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:27] [load] Starting to load store
    [2026-05-06 23:22:27] [store_path] Resolving application handle
    [2026-05-06 23:22:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:27] [load] Reading file content
    [2026-05-06 23:22:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:27] [load] Starting to load store
    [2026-05-06 23:22:27] [store_path] Resolving application handle
    [2026-05-06 23:22:27] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:27] [load] Reading file content
    [2026-05-06 23:22:27] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:27] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:32] [load] Starting to load store
    [2026-05-06 23:22:32] [store_path] Resolving application handle
    [2026-05-06 23:22:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:32] [load] Reading file content
    [2026-05-06 23:22:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:32] [load] Starting to load store
    [2026-05-06 23:22:32] [store_path] Resolving application handle
    [2026-05-06 23:22:32] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:32] [load] Reading file content
    [2026-05-06 23:22:32] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:32] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:37] [load] Starting to load store
    [2026-05-06 23:22:37] [store_path] Resolving application handle
    [2026-05-06 23:22:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:37] [load] Reading file content
    [2026-05-06 23:22:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:37] [load] Starting to load store
    [2026-05-06 23:22:37] [store_path] Resolving application handle
    [2026-05-06 23:22:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:37] [load] Reading file content
    [2026-05-06 23:22:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:42] [load] Starting to load store
    [2026-05-06 23:22:42] [store_path] Resolving application handle
    [2026-05-06 23:22:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:42] [load] Reading file content
    [2026-05-06 23:22:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:42] [load] Starting to load store
    [2026-05-06 23:22:42] [store_path] Resolving application handle
    [2026-05-06 23:22:42] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:42] [load] Reading file content
    [2026-05-06 23:22:42] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:42] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:47] [load] Starting to load store
    [2026-05-06 23:22:47] [store_path] Resolving application handle
    [2026-05-06 23:22:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:47] [load] Reading file content
    [2026-05-06 23:22:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:47] [load] Starting to load store
    [2026-05-06 23:22:47] [store_path] Resolving application handle
    [2026-05-06 23:22:47] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:47] [load] Reading file content
    [2026-05-06 23:22:47] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:47] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:52] [load] Starting to load store
    [2026-05-06 23:22:52] [store_path] Resolving application handle
    [2026-05-06 23:22:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:52] [load] Reading file content
    [2026-05-06 23:22:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:52] [load] Starting to load store
    [2026-05-06 23:22:52] [store_path] Resolving application handle
    [2026-05-06 23:22:52] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:52] [load] Reading file content
    [2026-05-06 23:22:52] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:52] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:22:57] [load] Starting to load store
    [2026-05-06 23:22:57] [store_path] Resolving application handle
    [2026-05-06 23:22:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:57] [load] Reading file content
    [2026-05-06 23:22:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:22:57] [load] Starting to load store
    [2026-05-06 23:22:57] [store_path] Resolving application handle
    [2026-05-06 23:22:57] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:22:57] [load] Reading file content
    [2026-05-06 23:22:57] [load] File read successfully (578 bytes)
    [2026-05-06 23:22:57] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:23:02] [load] Starting to load store
    [2026-05-06 23:23:02] [store_path] Resolving application handle
    [2026-05-06 23:23:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:02] [load] Reading file content
    [2026-05-06 23:23:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:23:02] [load] Starting to load store
    [2026-05-06 23:23:02] [store_path] Resolving application handle
    [2026-05-06 23:23:02] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:02] [load] Reading file content
    [2026-05-06 23:23:02] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:02] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:23:07] [load] Starting to load store
    [2026-05-06 23:23:07] [store_path] Resolving application handle
    [2026-05-06 23:23:07] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:07] [load] Reading file content
    [2026-05-06 23:23:07] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:07] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:23:07] [load] Starting to load store
    [2026-05-06 23:23:07] [store_path] Resolving application handle
    [2026-05-06 23:23:08] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:08] [load] Reading file content
    [2026-05-06 23:23:08] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:08] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:23:27] [load] Starting to load store
    [2026-05-06 23:23:27] [store_path] Resolving application handle
    [2026-05-06 23:23:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:28] [load] Reading file content
    [2026-05-06 23:23:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:28] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:23:28] [load] Starting to load store
    [2026-05-06 23:23:28] [store_path] Resolving application handle
    [2026-05-06 23:23:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:28] [load] Reading file content
    [2026-05-06 23:23:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:28] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:23:28] [load] Starting to load store
    [2026-05-06 23:23:28] [store_path] Resolving application handle
    [2026-05-06 23:23:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:28] [load] Reading file content
    [2026-05-06 23:23:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:28] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:23:28] [load] Starting to load store
    [2026-05-06 23:23:28] [store_path] Resolving application handle
    [2026-05-06 23:23:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:28] [load] Reading file content
    [2026-05-06 23:23:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:28] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:23:28] [load] Starting to load store
    [2026-05-06 23:23:28] [store_path] Resolving application handle
    [2026-05-06 23:23:28] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:23:28] [load] Reading file content
    [2026-05-06 23:23:28] [load] File read successfully (578 bytes)
    [2026-05-06 23:23:28] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:24:04] [load] Starting to load store
    [2026-05-06 23:24:04] [store_path] Resolving application handle
    [2026-05-06 23:24:04] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:04] [load] Reading file content
    [2026-05-06 23:24:04] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:04] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:24:14] [load] Starting to load store
    [2026-05-06 23:24:14] [store_path] Resolving application handle
    [2026-05-06 23:24:14] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:14] [load] Reading file content
    [2026-05-06 23:24:14] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:14] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:24:37] [load] Starting to load store
    [2026-05-06 23:24:37] [store_path] Resolving application handle
    [2026-05-06 23:24:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:37] [load] Reading file content
    [2026-05-06 23:24:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:24:37] [load] Starting to load store
    [2026-05-06 23:24:37] [store_path] Resolving application handle
    [2026-05-06 23:24:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:37] [load] Reading file content
    [2026-05-06 23:24:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:48] [load] Starting to load store
    [2026-05-06 23:24:48] [store_path] Resolving application handle
    [2026-05-06 23:24:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:48] [load] Reading file content
    [2026-05-06 23:24:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:48] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:24:49] [load] Starting to load store
    [2026-05-06 23:24:49] [store_path] Resolving application handle
    [2026-05-06 23:24:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:24:49] [load] Reading file content
    [2026-05-06 23:24:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:24:49] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:04] [load] Starting to load store
    [2026-05-06 23:25:04] [store_path] Resolving application handle
    [2026-05-06 23:25:04] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:04] [load] Reading file content
    [2026-05-06 23:25:04] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:04] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:15] [load] Starting to load store
    [2026-05-06 23:25:15] [store_path] Resolving application handle
    [2026-05-06 23:25:15] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:15] [load] Reading file content
    [2026-05-06 23:25:15] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:15] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:20] [load] Starting to load store
    [2026-05-06 23:25:20] [store_path] Resolving application handle
    [2026-05-06 23:25:20] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:20] [load] Reading file content
    [2026-05-06 23:25:20] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:20] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:30] [load] Starting to load store
    [2026-05-06 23:25:30] [store_path] Resolving application handle
    [2026-05-06 23:25:30] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:30] [load] Reading file content
    [2026-05-06 23:25:30] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:30] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:39] [load] Starting to load store
    [2026-05-06 23:25:39] [store_path] Resolving application handle
    [2026-05-06 23:25:39] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:40] [load] Reading file content
    [2026-05-06 23:25:40] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:40] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:48] [load] Starting to load store
    [2026-05-06 23:25:48] [store_path] Resolving application handle
    [2026-05-06 23:25:48] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:48] [load] Reading file content
    [2026-05-06 23:25:48] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:48] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:25:56] [load] Starting to load store
    [2026-05-06 23:25:56] [store_path] Resolving application handle
    [2026-05-06 23:25:56] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:25:56] [load] Reading file content
    [2026-05-06 23:25:56] [load] File read successfully (578 bytes)
    [2026-05-06 23:25:56] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:26:13] [load] Starting to load store
    [2026-05-06 23:26:13] [store_path] Resolving application handle
    [2026-05-06 23:26:13] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:26:13] [load] Reading file content
    [2026-05-06 23:26:13] [load] File read successfully (578 bytes)
    [2026-05-06 23:26:13] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:26:16] [load] Starting to load store
    [2026-05-06 23:26:16] [store_path] Resolving application handle
    [2026-05-06 23:26:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:26:17] [load] Reading file content
    [2026-05-06 23:26:17] [load] File read successfully (578 bytes)
    [2026-05-06 23:26:17] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:26:21] [load] Starting to load store
    [2026-05-06 23:26:21] [store_path] Resolving application handle
    [2026-05-06 23:26:21] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:26:21] [load] Reading file content
    [2026-05-06 23:26:21] [load] File read successfully (578 bytes)
    [2026-05-06 23:26:21] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:26:37] [load] Starting to load store
    [2026-05-06 23:26:37] [store_path] Resolving application handle
    [2026-05-06 23:26:37] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:26:37] [load] Reading file content
    [2026-05-06 23:26:37] [load] File read successfully (578 bytes)
    [2026-05-06 23:26:37] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:27:10] [load] Starting to load store
    [2026-05-06 23:27:10] [store_path] Resolving application handle
    [2026-05-06 23:27:10] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:27:10] [load] Reading file content
    [2026-05-06 23:27:10] [load] File read successfully (578 bytes)
    [2026-05-06 23:27:10] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:27:16] [load] Starting to load store
    [2026-05-06 23:27:16] [store_path] Resolving application handle
    [2026-05-06 23:27:16] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:27:16] [load] Reading file content
    [2026-05-06 23:27:16] [load] File read successfully (578 bytes)
    [2026-05-06 23:27:16] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:27:38] [load] Starting to load store
    [2026-05-06 23:27:38] [store_path] Resolving application handle
    [2026-05-06 23:27:38] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:27:38] [load] Reading file content
    [2026-05-06 23:27:38] [load] File read successfully (578 bytes)
    [2026-05-06 23:27:38] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_vpn_status] called for id=4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [2026-05-06 23:27:44] [load] Starting to load store
    [2026-05-06 23:27:44] [store_path] Resolving application handle
    [2026-05-06 23:27:44] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:27:44] [load] Reading file content
    [2026-05-06 23:27:44] [load] File read successfully (578 bytes)
    [2026-05-06 23:27:44] [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4e801a54-3e1b-4966-9a2d-f9481d884a1b
    [powershell] running: (Get-VpnConnection -Name '4e801a54-3e1b-4966-9a2d-f9481d884a1b' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [get_connections] called
    [2026-05-06 23:27:49] [load] Starting to load store
    [2026-05-06 23:27:49] [store_path] Resolving application handle
    [2026-05-06 23:27:49] [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [2026-05-06 23:27:49] [load] Reading file content
    [2026-05-06 23:27:49] [load] File read successfully (578 bytes)
    [2026-05-06 23:27:49] [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content[load] File read successfully (578 bytes)

    [load] File read successfully (578 bytes)
    [load] ERROR: Failed to parse JSON: missing field `labels` at line 18 column 5
    [load] ERROR: Failed to parse JSON: missing field `labels` at line 18 column 5
    [get_connections] called
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (578 bytes)
    [load] Reading file content
    [load] ERROR: Failed to parse JSON: missing field `labels` at line 18 column 5
    [load] File read successfully (578 bytes)
    [load] ERROR: Failed to parse JSON: missing field `labels` at line 18 column 5
    [save_connection] called, id=None
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (578 bytes)
    [load] ERROR: Failed to parse JSON: missing field `labels` at line 18 column 5
    [set_password] key='password_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [set_password] key='shared_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [save_connection] success
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [save_connection] called, id=None
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [set_password] key='password_4e42bb93-02df-48cc-a248-aac430e4bcdd'
    [set_password] key='shared_4e42bb93-02df-48cc-a248-aac430e4bcdd'
    [save] Starting save process. Connections to save: 2
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [save_connection] success
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [save_connection] called, id=None
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [set_password] key='password_2eccc09e-947f-43f5-ae41-783ed8e37568'
    [set_password] key='shared_2eccc09e-947f-43f5-ae41-783ed8e37568'
    [save] Starting save process. Connections to save: 3
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [save_connection] success
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: 2eccc09e-947f-43f5-ae41-783ed8e37568
    [powershell] running: (Get-VpnConnection -Name '2eccc09e-947f-43f5-ae41-783ed8e37568' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: 2eccc09e-947f-43f5-ae41-783ed8e37568
    [powershell] running: (Get-VpnConnection -Name '2eccc09e-947f-43f5-ae41-783ed8e37568' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Starting to load store
    [store_path] Resolving application handle
    [load] Reading file content
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] File read successfully (1682 bytes)
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"[load] Reading file content

    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] File read successfully (1682 bytes)
    [load] Reading file content[powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus

    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [load] JSON parsed successfully. Connections count: 3
    [get_vpn_status] name: 2eccc09e-947f-43f5-ae41-783ed8e37568
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name '2eccc09e-947f-43f5-ae41-783ed8e37568' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (1682 bytes)[load] File read successfully (1682 bytes)

    [load] JSON parsed successfully. Connections count: 3
    [load] JSON parsed successfully. Connections count: 3
    [load] File read successfully (1682 bytes)
    [get_vpn_status] name: 2eccc09e-947f-43f5-ae41-783ed8e37568
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name '2eccc09e-947f-43f5-ae41-783ed8e37568' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus[load] JSON parsed successfully. Connections count: 3

    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [delete_connection] (windows) called for id=2eccc09e-947f-43f5-ae41-783ed8e37568
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1682 bytes)
    [load] JSON parsed successfully. Connections count: 3
    [delete_password] key='password_2eccc09e-947f-43f5-ae41-783ed8e37568'
    [delete_password] key='shared_2eccc09e-947f-43f5-ae41-783ed8e37568'
    [delete_vpn_service] name: 2eccc09e-947f-43f5-ae41-783ed8e37568
    [powershell] running: Remove-VpnConnection -Name '2eccc09e-947f-43f5-ae41-783ed8e37568' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [save] Starting save process. Connections to save: 2
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [load] File read successfully (1196 bytes)
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [load] JSON parsed successfully. Connections count: 2
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [load] Starting to load store
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [store_path] Resolving application handle
    [load] File read successfully (1196 bytes)
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] JSON parsed successfully. Connections count: 2
    [load] Reading file content
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] File read successfully (1196 bytes)
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] JSON parsed successfully. Connections count: 2
    [get_vpn_status] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: (Get-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -ErrorAction SilentlyContinue).ConnectionStatus
    [delete_connection] (windows) called for id=4e42bb93-02df-48cc-a248-aac430e4bcdd
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (1196 bytes)
    [load] JSON parsed successfully. Connections count: 2
    [delete_password] key='password_4e42bb93-02df-48cc-a248-aac430e4bcdd'
    [delete_password] key='shared_4e42bb93-02df-48cc-a248-aac430e4bcdd'
    [delete_vpn_service] name: 4e42bb93-02df-48cc-a248-aac430e4bcdd
    [powershell] running: Remove-VpnConnection -Name '4e42bb93-02df-48cc-a248-aac430e4bcdd' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] (windows) called for id=d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (710 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [get_password] key='shared_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [create_vpn_service] name: d6877136-2fe6-411a-8de3-83878aecdbbe, server: 87.249.5.138
    [delete_vpn_service] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: Remove-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"d6877136-2fe6-411a-8de3-83878aecdbbe" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"d6877136-2fe6-411a-8de3-83878aecdbbe" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] (windows) called for id=d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [get_password] key='shared_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [connect_vpn] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [connect_vpn] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [connect_vpn] stdout:

        Remote Access error 756 - This connection is already being dialed.

    For more help on this error:
        Type 'hh netcfg.chm'
    In help, click Troubleshooting, then Error Messages, then 756

    stderr:
        status: exit code: 756
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] (windows) called for id=d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [get_password] key='shared_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [connect_vpn] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [connect_vpn] stdout:

        Remote Access error 756 - This connection is already being dialed.

    For more help on this error:
        Type 'hh netcfg.chm'
    In help, click Troubleshooting, then Error Messages, then 756

    stderr:
        status: exit code: 756
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connecting

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connecting'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] stdout: ????????? ????? ? d6877136-2fe6-411a-8de3-83878aecdbbe...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? d6877136-2fe6-411a-8de3-83878aecdbbe.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [disconnect_vpn] called for id=d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [disconnect_vpn] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: rasdial 'd6877136-2fe6-411a-8de3-83878aecdbbe' /disconnect
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Command completed successfully.

    stderr:
        status: exit code: 0
    [disconnect_vpn] finished
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [delete_connection] (windows) called for id=d6877136-2fe6-411a-8de3-83878aecdbbe
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [delete_password] key='password_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [delete_password] key='shared_d6877136-2fe6-411a-8de3-83878aecdbbe'
    [delete_vpn_service] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: Remove-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (724 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: d6877136-2fe6-411a-8de3-83878aecdbbe
    [powershell] running: (Get-VpnConnection -Name 'd6877136-2fe6-411a-8de3-83878aecdbbe' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [save] Starting save process. Connections to save: 0
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [save_connection] called, id=None
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [set_password] key='password_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [set_password] key='shared_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [save_connection] success
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] (windows) called for id=4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [get_password] key='shared_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [create_vpn_service] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f, server: 87.249.5.138
    [delete_vpn_service] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: Remove-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [connect_vpn] (windows) called for id=4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (669 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [get_password] key='shared_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [create_vpn_service] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f, server: 87.249.5.138
    [delete_vpn_service] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: Remove-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [connect_vpn] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [connect_vpn] stdout:

        Remote Access error 756 - This connection is already being dialed.

    For more help on this error:
        Type 'hh netcfg.chm'
    In help, click Troubleshooting, then Error Messages, then 756

    stderr:
        status: exit code: 756
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connecting

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connecting'
    [connect_vpn] stdout: ????????? ????? ? 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store[load] Starting to load store
    [load] Starting to load store
    [load] Starting to load store

    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolving application handle
    [load] Reading file content
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] File read successfully (683 bytes)[store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"

    [store_path] Resolving application handle
    [load] File read successfully (683 bytes)[load] Reading file content

    [load] Reading file content[load] JSON parsed successfully. Connections count: 1[store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"


    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] File read successfully (683 bytes)
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] JSON parsed successfully. Connections count: 1
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus[load] Starting to load store

    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"[store_path] Resolving application handle

    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content[load] Starting to load store

    [load] File read successfully (683 bytes)
    [store_path] Resolving application handle
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] Starting to load store
    [load] Starting to load store
    [load] Starting to load store
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] JSON parsed successfully. Connections count: 1
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] JSON parsed successfully. Connections count: 1
    [load] Reading file content
    [store_path] Resolving application handle
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] File read successfully (683 bytes)
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [load] JSON parsed successfully. Connections count: 1
    [load] Reading file content
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_connections] called
    [load] Starting to load store
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] JSON parsed successfully. Connections count: 1
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [delete_connection] (windows) called for id=4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [delete_password] key='password_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [delete_password] key='shared_4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f'
    [delete_vpn_service] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: Remove-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -Force -ErrorAction SilentlyContinue; exit 0
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (683 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f
    [powershell] running: (Get-VpnConnection -Name '4b0c0b1e-67b8-4e3d-b85e-3d72d2edbd6f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [save] Starting save process. Connections to save: 0
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [save_connection] called, id=None
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (222 bytes)
    [load] JSON parsed successfully. Connections count: 0
    [set_password] key='password_701f4f26-0974-4411-912b-23e773dc436f'
    [set_password] key='shared_701f4f26-0974-4411-912b-23e773dc436f'
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [save_connection] success
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_connections] called
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] (windows) called for id=701f4f26-0974-4411-912b-23e773dc436f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_701f4f26-0974-4411-912b-23e773dc436f'
    [get_password] key='shared_701f4f26-0974-4411-912b-23e773dc436f'
    [create_vpn_service] name: 701f4f26-0974-4411-912b-23e773dc436f, server: 87.249.5.138
    [delete_vpn_service] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: Remove-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [get_vpn_status] raw status: ''
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [connect_vpn] (windows) called for id=701f4f26-0974-4411-912b-23e773dc436f
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (662 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_password] key='password_701f4f26-0974-4411-912b-23e773dc436f'
    [get_password] key='shared_701f4f26-0974-4411-912b-23e773dc436f'
    [create_vpn_service] name: 701f4f26-0974-4411-912b-23e773dc436f, server: 87.249.5.138
    [delete_vpn_service] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: Remove-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -Force -ErrorAction SilentlyContinue; exit 0
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"701f4f26-0974-4411-912b-23e773dc436f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"701f4f26-0974-4411-912b-23e773dc436f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [delete_vpn_service] finished
    [create_vpn_service] create script: Add-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] running: Add-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ServerAddress '87.249.5.138' -TunnelType L2tp -L2tpPsk 'UCGb2JhyXor@ui*83cRP' -AuthenticationMethod MSChapv2 -RememberCredential -Force
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout:
        stderr:
        status: exit code: 0
    [create_vpn_service] cred script: cmdkey /add:"701f4f26-0974-4411-912b-23e773dc436f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] running: cmdkey /add:"701f4f26-0974-4411-912b-23e773dc436f" /user:"itego-admin" /pass:"GS8MkX%daj5DI4sPA@uL"
    [powershell] stdout:
        CMDKEY: Credential added successfully.

    stderr:
        status: exit code: 0
    [create_vpn_service] success
    [save] Starting save process. Connections to save: 1
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Ensuring directory exists: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub"
    [save] Serializing store to pretty JSON
    [save] Writing data to "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [save] Store saved successfully
    [connect_vpn] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] stdout: Disconnected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'disconnected'
    [connect_vpn] name: 701f4f26-0974-4411-912b-23e773dc436f
    [connect_vpn] stdout: You are already connected to 701f4f26-0974-4411-912b-23e773dc436f.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [connect_vpn] stdout: ????????? ????? ? 701f4f26-0974-4411-912b-23e773dc436f...
    ???????? ????? ? ?????? ????????????...
    ??????????? ?????????? ? ????...
    ??????????? ????? ? 701f4f26-0974-4411-912b-23e773dc436f.
    Command completed successfully.

    stderr:
        status: exit code: 0
    [connect_vpn] success
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    [load] Starting to load store
    [store_path] Resolving application handle
    [store_path] Resolved path: "C:\\Users\\itego\\AppData\\Roaming\\com.sentiago.l2tp-hub\\connections.json"
    [load] Reading file content
    [load] File read successfully (676 bytes)
    [load] JSON parsed successfully. Connections count: 1
    [get_vpn_status] name: 701f4f26-0974-4411-912b-23e773dc436f
    [powershell] running: (Get-VpnConnection -Name '701f4f26-0974-4411-912b-23e773dc436f' -ErrorAction SilentlyContinue).ConnectionStatus
    [powershell] stdout: Connected

    stderr:
        status: exit code: 0
    [get_vpn_status] raw status: 'connected'
    : (id: string) => void;
    onDisconnect: (id: string) => void;
    onEdit: (c: Connection) => void;
    onDelete: (id: string) => void;
}) {
    const busy = isBusy(c);
    return (
        <>
            <ConnectButton c={c} onConnect={onConnect} onDisconnect={onDisconnect}/>
            <Tooltip title="Редактировать">
        <span>
          <IconButton size="small" onClick={() => onEdit(c)} disabled={busy}>
            <Edit fontSize="small"/>
          </IconButton>
        </span>
            </Tooltip>
            <Tooltip title="Удалить">
        <span>
          <IconButton size="small" color="error" onClick={() => onDelete(c.id)} disabled={busy}>
            <Delete fontSize="small"/>
          </IconButton>
        </span>
            </Tooltip>
            <Tooltip title={c.id}>
        <span>
          <IconButton size="small" color="default" disabled={busy}>
            <Info fontSize="small"/>
          </IconButton>
        </span>
            </Tooltip>
        </>
    );
}

// ─── ConnectionRow ────────────────────────────────────────────────────────────

function ConnectionRow({connection: c, labels, onConnect, onDisconnect, onEdit, onDelete}: ConnectionItemProps) {
    const onDoubleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
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
    }

    return (
        <TableRow hover onDoubleClick={onDoubleClick}>
            <TableCell>
                <Typography variant="body2" sx={{fontWeight: 500}}>
                    {getDisplayName(c)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {c.server}
                </Typography>
            </TableCell>
            <TableCell>
                <Chip
                    size="small"
                    label={STATUS_LABEL[c.status] ?? c.status}
                    color={STATUS_COLOR[c.status] ?? "default"}
                    variant={c.status === "connected" ? "filled" : "outlined"}
                />
            </TableCell>
            <TableCell>
                <LabelChips connection={c} labels={labels}/>
            </TableCell>
            <TableCell align="right">
                <Box sx={{display: "flex", gap: 0.5, justifyContent: "flex-end"}}>
                    <ActionButtons
                        c={c}
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

// ─── ConnectionCard ───────────────────────────────────────────────────────────

function ConnectionCard({connection: c, labels, onConnect, onDisconnect, onEdit, onDelete}: ConnectionItemProps) {
    return (
        <Card
            variant="outlined"
            sx={{
                display: "flex",
                flexDirection: "column",
                borderColor: c.status === "connected" ? "success.main" : undefined,
            }}
        >
            <CardContent sx={{flex: 1, pb: 1}}>
                <Box sx={{display: "flex", justifyContent: "space-between", mb: 1}}>
                    <Box>
                        <Typography variant="body2" sx={{fontWeight: 500}}>
                            {getDisplayName(c)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {c.server}
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={STATUS_LABEL[c.status] ?? c.status}
                        color={STATUS_COLOR[c.status] ?? "default"}
                        variant={c.status === "connected" ? "filled" : "outlined"}
                    />
                </Box>
                <LabelChips connection={c} labels={labels}/>
            </CardContent>
            <CardActions sx={{pt: 0, justifyContent: "flex-end"}}>
                <ActionButtons
                    c={c}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </CardActions>
        </Card>
    );
}

// ─── useDeleteConfirm ─────────────────────────────────────────────────────────

function useDeleteConfirm(onDelete: (id: string) => void) {
    const [pendingId, setPendingId] = useState<string | null>(null);

    const request = (id: string) => setPendingId(id);
    const confirm = () => {
        if (pendingId) onDelete(pendingId);
        setPendingId(null);
    };
    const cancel = () => setPendingId(null);

    const dialog = (
        <Dialog open={pendingId !== null} onClose={cancel} maxWidth="xs" fullWidth>
            <DialogTitle>Удалить подключение?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Подключение и все его данные будут удалены без возможности восстановления.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={cancel}>Отмена</Button>
                <Button color="error" variant="contained" onClick={confirm}>
                    Удалить
                </Button>
            </DialogActions>
        </Dialog>
    );

    return {request, dialog};
}

// ─── ConnectionList ───────────────────────────────────────────────────────────

interface Props {
    connections: ConnectionWithStatus[];
    labels: Label[];
    loading: boolean;
    filter: FilterState;
    onFilterChange: (f: FilterState) => void;
    sortField: SortField;
    sortDir: SortDir;
    onSort: (field: SortField) => void;
    onConnect: (id: string) => void;
    onDisconnect: (id: string) => void;
    onEdit: (c: Connection) => void;
    onDelete: (id: string) => void;
}

export function ConnectionList({
                                   connections,
                                   labels,
                                   loading,
                                   filter,
                                   onFilterChange,
                                   ...p
                               }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const {request: requestDelete, dialog: deleteDialog} = useDeleteConfirm(p.onDelete);

    const itemProps = (c: ConnectionWithStatus): ConnectionItemProps => ({
        connection: c,
        labels,
        onConnect: p.onConnect,
        onDisconnect: p.onDisconnect,
        onEdit: p.onEdit,
        onDelete: requestDelete,
    });

    return (
        <Box>
            {deleteDialog}

            <Box sx={{display: "flex", gap: 2, mb: 2, alignItems: "center"}}>
                <TextField
                    size="small"
                    placeholder="Поиск..."
                    value={filter.search}
                    onChange={(e) => onFilterChange({...filter, search: e.target.value})}
                    sx={{flex: 1}}
                />
                <ToggleButtonGroup
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={(_, v) => v && setViewMode(v)}
                >
                    <ToggleButton value="table"><ViewList fontSize="small"/></ToggleButton>
                    <ToggleButton value="cards"><GridView fontSize="small"/></ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {viewMode === "table" ? (
                <Paper variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={p.sortField === "name"}
                                        direction={p.sortField === "name" ? p.sortDir : "asc"}
                                        onClick={() => p.onSort("name")}
                                    >
                                        Подключение
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={p.sortField === "status"}
                                        direction={p.sortField === "status" ? p.sortDir : "asc"}
                                        onClick={() => p.onSort("status")}
                                    >
                                        Статус
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Метки</TableCell>
                                <TableCell align="right">Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {connections.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{py: 4, color: "text.secondary"}}>
                                        Нет подключений
                                    </TableCell>
                                </TableRow>
                            ) : (
                                connections.map((c) => <ConnectionRow key={c.id} {...itemProps(c)} />)
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            ) : (
                <Box sx={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2}}>
                    {connections.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{py: 4, gridColumn: "1 / -1"}}>
                            Нет подключений
                        </Typography>
                    ) : (
                        connections.map((c) => <ConnectionCard key={c.id} {...itemProps(c)} />)
                    )}
                </Box>
            )}
        </Box>
    );
}