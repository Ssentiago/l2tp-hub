import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { api } from "../core/api";
import type { WorkspaceInfo } from "../typing/definitions";

interface Props {
  activeId: string;
  onSwitch: (id: string) => void;
  onChange: () => void;
}

export function WorkspaceSelector({ activeId, onSwitch, onChange }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setWorkspaces(await api.workspaces.list());
  };

  useEffect(() => {
    load();
  }, [activeId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const ws = await api.workspaces.create(newName.trim());
    setNewName("");
    setCreateOpen(false);
    await api.workspaces.switch(ws.id);
    onSwitch(ws.id);
    onChange();
    load();
  };

  const handleRename = async () => {
    if (!editId || !editName.trim()) return;
    await api.workspaces.rename(editId, editName.trim());
    setEditId(null);
    onChange();
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.workspaces.delete(deleteId);
    setDeleteId(null);
    onChange();
    load();
  };

  const handleSwitch = async (id: string) => {
    await api.workspaces.switch(id);
    onSwitch(id);
    onChange();
  };

  const activeIdx = workspaces.findIndex((w) => w.id === activeId);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Tabs
        value={activeIdx >= 0 ? activeIdx : 0}
        onChange={(_, v) => handleSwitch(workspaces[v].id)}
        sx={{ minHeight: 36 }}
      >
        {workspaces.map((ws) => (
          <Tab
            key={ws.id}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {ws.name}
                <Tooltip title="Переименовать">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditId(ws.id);
                      setEditName(ws.name);
                    }}
                    sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                {workspaces.length > 1 && (
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(ws.id);
                      }}
                      sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            }
            sx={{ minHeight: 36, py: 0 }}
          />
        ))}
      </Tabs>
      <Tooltip title="Новое пространство">
        <IconButton size="small" onClick={() => setCreateOpen(true)}>
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Новое пространство</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Название"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => setEditId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Переименовать</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Название"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleRename} disabled={!editName.trim()}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить пространство?</DialogTitle>
        <DialogContent>
          Все подключения внутри будут удалены без возможности восстановления.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
