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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from "@mui/material";
import {
  Connection,
  ConnectionWithStatus,
  FilterState,
  Label,
  SortDir,
  SortField,
} from "../../../typing/definitions";
import { ConnectionRow, ConnectionRowProps } from "./ConnectionRow.tsx";

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

export function ConnectionList({
  connections,
  labels,
  loading,
  filter,
  onFilterChange,
  ...props
}: ConnectionListProps) {
  const { request: requestDelete, dialog: deleteDialog } = useDeleteConfirm(
    props.onDelete,
  );

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
                  <ConnectionRow
                    key={c.id}
                    connection={c}
                    onConnect={props.onConnect}
                    onDisconnect={props.onDisconnect}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                    labels={labels}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      }
    </Box>
  );
}
