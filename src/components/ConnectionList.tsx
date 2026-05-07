import { useState } from "react";
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
  Delete,
  ViewList,
  GridView,
  LowPriority,
} from "@mui/icons-material";
import {
  ConnectionWithStatus,
  FilterState,
  SortDir,
  SortField,
  Connection,
  Label,
} from "../types";

type ViewMode = "table" | "cards";

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

const STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
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
        <IconButton
          size="small"
          color="error"
          onClick={() => onDisconnect(c.id)}
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
          onClick={() => onConnect(c.id)}
          disabled={c.status === "connecting"}
        >
          <PlayArrow fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}

// Fix 5: confirm dialog перед удалением
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
          Подключение и все его данные будут удалены без возможности
          восстановления.
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

  return { request, dialog };
}

function getDisplayName(c: Connection): string {
  return c.labels["company"] || c.name;
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
  const { request: requestDelete, dialog: deleteDialog } = useDeleteConfirm(
    p.onDelete,
  );

  const busy = (c: ConnectionWithStatus) =>
    ["connected", "connecting"].includes(c.status);

  return (
    <Box>
      {deleteDialog}

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Поиск..."
          value={filter.search}
          onChange={(e) =>
            onFilterChange({ ...filter, search: e.target.value })
          }
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
        >
          <ToggleButton value="table">
            <ViewList fontSize="small" />
          </ToggleButton>
          <ToggleButton value="cards">
            <GridView fontSize="small" />
          </ToggleButton>
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
                {/* Fix 6: иконка вместо "P-ty" */}
                <TableCell>
                  <Tooltip title="Приоритет">
                    <TableSortLabel
                      active={p.sortField === "priority"}
                      direction={p.sortField === "priority" ? p.sortDir : "asc"}
                      onClick={() => p.onSort("priority")}
                    >
                      <LowPriority fontSize="small" />
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell>Метки</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Нет подключений
                  </TableCell>
                </TableRow>
              ) : (
                connections.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                        variant={
                          c.status === "connected" ? "filled" : "outlined"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        P{c.priority}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <LabelChips connection={c} labels={labels} />
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "flex-end",
                        }}
                      >
                        <ConnectButton
                          c={c}
                          onConnect={p.onConnect}
                          onDisconnect={p.onDisconnect}
                        />
                        <Tooltip title="Редактировать">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => p.onEdit(c)}
                              disabled={busy(c)}
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
                              onClick={() => requestDelete(c.id)}
                              disabled={busy(c)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 2,
          }}
        >
          {connections.length === 0 ? (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Нет подключений
              </Typography>
            </Box>
          ) : (
            connections.map((c) => (
              <Card
                key={c.id}
                variant="outlined"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  borderColor:
                    c.status === "connected" ? "success.main" : undefined,
                }}
              >
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                  <LabelChips connection={c} labels={labels} />
                </CardContent>
                <CardActions sx={{ pt: 0, justifyContent: "flex-end" }}>
                  <ConnectButton
                    c={c}
                    onConnect={p.onConnect}
                    onDisconnect={p.onDisconnect}
                  />
                  <Tooltip title="Редактировать">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => p.onEdit(c)}
                        disabled={busy(c)}
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
                        onClick={() => requestDelete(c.id)}
                        disabled={busy(c)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </CardActions>
              </Card>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
