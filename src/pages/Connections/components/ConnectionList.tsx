import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField
} from "@mui/material";
import {
  Connection,
  ConnectionWithStatus,
  FilterState,
  Label,
  SortDir,
  SortField
} from "../../../typing/definitions";
import { ConnectionRow, ConnectionRowProps } from "./ConnectionRow.tsx";
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


function groupByCompany(connections: ConnectionWithStatus[], labels: Label[]) {
  const groups = new Map<string, ConnectionWithStatus[]>();

  for (const c of connections) {
    const company = c.labels["company"] ?? "";
    if (!groups.has(company)) groups.set(company, []);
    groups.get(company)!.push(c);
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (!a && b) return 1;
    if (a && !b) return -1;
    return a.localeCompare(b);
  });
}

export function ConnectionList({
                                 connections,
                                 labels,
                                 loading,
                                 filter,
                                 onFilterChange,
                                 ...props
                               }: ConnectionListProps) {
  const { request: requestDelete, dialog: deleteDialog } = useDeleteConfirm(
    props.onDelete
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const toggleGroup = (company: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(company) ? next.delete(company) : next.add(company);
      return next;
    });
  };

  const rowProps = {
    labels,
    onConnect: props.onConnect,
    onDisconnect: props.onDisconnect,
    onEdit: props.onEdit,
    onDelete: requestDelete
  };

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
                const groups = groupByCompany(connections, labels);

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
                            {company || "Без компании"}
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
