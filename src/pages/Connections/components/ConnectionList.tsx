import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from "@mui/material";
import {
  Connection,
  ConnectionWithStatus,
  FilterState,
  Label,
  SortDir,
  SortField
} from "../../../typing/definitions";
import { ConnectionRow, STATUS_LABEL } from "./ConnectionRow.tsx";
import { ChevronRight, ExpandMore } from "@mui/icons-material";

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

interface ConnectionListProps {
  connections: ConnectionWithStatus[];
  allConnections: ConnectionWithStatus[];
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
  connectingId: string | null;
  disconnectingId: string | null;
  deletingId: string | null;
  groupBy: string;
  onGroupByChange: (labelId: string) => void;
}


function groupByLabel(
  connections: ConnectionWithStatus[],
  labelId: string
): [string, ConnectionWithStatus[]][] {
  if (!labelId) {
    return [["", connections]];
  }
  const groups = new Map<string, ConnectionWithStatus[]>();
  for (const c of connections) {
    const value = c.labels[labelId] ?? "";
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value)!.push(c);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (!a && b) return 1;
    if (a && !b) return -1;
    return a.localeCompare(b);
  });
}

export function ConnectionList({
                                 connections,
                                 allConnections,
                                 labels,
                                 loading,
                                 filter,
                                 onFilterChange,
                                 groupBy,
                                 onGroupByChange,
                                 connectingId,
                                 disconnectingId,
                                 deletingId,
                                 ...props
                               }: ConnectionListProps) {
  const { request: requestDelete, dialog: deleteDialog } = useDeleteConfirm(
    props.onDelete
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  function collectLabelValues(
    connections: ConnectionWithStatus[],
    labels: Label[]
  ): Map<string, string[]> {
    const result = new Map<string, Set<string>>();
    for (const label of labels) {
      result.set(label.id, new Set());
    }
    for (const c of connections) {
      for (const [id, value] of Object.entries(c.labels)) {
        if (value && result.has(id)) {
          result.get(id)!.add(value);
        }
      }
    }
    return new Map(
      [...result.entries()].map(([id, set]) => [id, [...set].sort()])
    );
  }

  const toggleGroup = (company: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(company) ? next.delete(company) : next.add(company);
      return next;
    });
  };

  const labelValues = collectLabelValues(allConnections, labels);

  const rowProps = {
    labels,
    onConnect: props.onConnect,
    onDisconnect: props.onDisconnect,
    onEdit: props.onEdit,
    onDelete: requestDelete,
    connectingId,
    disconnectingId,
    deletingId,
  };

  return (
    <Box>
      {deleteDialog}

      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Поиск..."
          value={filter.search}
          onChange={(e) =>
            onFilterChange({ ...filter, search: e.target.value })
          }
          fullWidth
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              label="Статус"
              value={filter.status}
              onChange={(e) =>
                onFilterChange({ ...filter, status: e.target.value })
              }
            >
              <MenuItem value="all">Все</MenuItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {labels.map((label) => {
            const values = labelValues.get(label.id) ?? [];
            if (values.length === 0) return null;
            return (
              <FormControl key={label.id} size="small" sx={{ minWidth: 140 }}>
                <InputLabel>{label.name}</InputLabel>
                <Select
                  label={label.name}
                  value={filter.labels[label.id] ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filter,
                      labels: {
                        ...filter.labels,
                        [label.id]: e.target.value || "",
                      },
                    })
                  }
                >
                  <MenuItem value="">Все</MenuItem>
                  {values.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          })}

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Группировка</InputLabel>
            <Select
              label="Группировка"
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
            >
              <MenuItem value="">Нет</MenuItem>
              {labels.map((label) => (
                <MenuItem key={label.id} value={label.id}>
                  {label.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {
        <Paper variant="outlined">
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={props.sortField === "name"}
                    direction={
                      props.sortField === "name" ? props.sortDir : "asc"
                    }
                    onClick={() => props.onSort("name")}
                  >
                    Подключение
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 150, whiteSpace: "nowrap" }}>
                  <TableSortLabel
                    active={props.sortField === "status"}
                    direction={
                      props.sortField === "status" ? props.sortDir : "asc"
                    }
                    onClick={() => props.onSort("status")}
                  >
                    Статус
                  </TableSortLabel>
                </TableCell>
                <TableCell>Метки</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                if (connections.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography color="text.disabled">
                          Нет подключений
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
                          Нажмите «Добавить», чтобы создать первое подключение
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                const groupLabel = labels.find((l) => l.id === groupBy)?.name ?? "группы";
                const groups = groupByLabel(connections, groupBy);

                if (groups.length === 1 && !groups[0][0]) {
                  return connections.map((c) => (
                    <ConnectionRow key={c.id} connection={c} {...rowProps} />
                  ));
                }

                return groups.flatMap(([company, conns]) => {
                  const isCollapsed = collapsedGroups.has(company);

                  return [
                    <TableRow
                      key={`group-${company}`}
                      onClick={() => toggleGroup(company)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell
                        colSpan={4}
                        sx={{
                          py: 0.5,
                          px: 2,
                          bgcolor: "action.hover",
                          borderBottom: "1px solid",
                          borderColor: "divider"
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {isCollapsed ? (
                            <ChevronRight fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontWeight: 600,
                              letterSpacing: 0.5,
                              textTransform: "uppercase"
                            }}
                          >
                            {company || `Без ${groupLabel}`}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {conns.length}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>,
                    ...(!isCollapsed
                      ? conns.map((c) => (
                        <ConnectionRow
                          key={c.id}
                          connection={c}
                          {...rowProps}
                          hideCompanyLabel
                        />
                      ))
                      : [])
                  ];
                });
              })()}
            </TableBody>
          </Table>
        </Paper>
      }
    </Box>
  );
}
