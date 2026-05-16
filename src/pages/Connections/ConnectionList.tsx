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
import toast from "react-hot-toast";

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
    onConnect: (id: string) => void;
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
            <Tooltip title={"Скопировать ID подключения"}>
        <span>
          <IconButton size="small" color="default" disabled={busy} onClick={async () => {
              await navigator.clipboard.write([
                  new ClipboardItem({"text/plain": new Blob([c.id], {type: "text/plain"})})
              ])
              toast.success("ID скопирован", {
                  style: {
                      background: "var(--mui-palette-background-paper)",
                      color: "var(--mui-palette-text-primary)",
                      border: "1px solid var(--mui-palette-divider)",
                  },
              });
          }}>
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
            <TableCell sx={{width: 150, whiteSpace: "nowrap"}}>
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
            </Box>

            {(
                <Paper variant="outlined">
                    <Table size="small" sx={{"tableLayout": "fixed"}}>
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
                                <TableCell sx={{width: 150, whiteSpace: "nowrap"}}>
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
            )}
        </Box>
    );
}