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
  CircularProgress,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import toast from "react-hot-toast";
import { useStore } from "../store";

export function WorkspaceSelector() {
  const {
    workspaces: storeWorkspaces,
    activeWorkspaceId,
    loadWorkspaces,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await createWorkspace(newName.trim());
      setNewName("");
      setCreateOpen(false);
      toast.success("Пространство создано");
    } catch (e) {
      console.error("[handleCreate] ERROR:", e);
      toast.error(`Ошибка создания пространства: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!editId || !editName.trim()) return;
    setSubmitting(true);
    try {
      await renameWorkspace(editId, editName.trim());
      setEditId(null);
      toast.success("Пространство переименовано");
    } catch (e) {
      console.error("[handleRename] ERROR:", e);
      toast.error(`Ошибка переименования: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await deleteWorkspace(deleteId);
      setDeleteId(null);
      toast.success("Пространство удалено");
    } catch (e) {
      console.error("[handleDelete] ERROR:", e);
      toast.error(`Ошибка удаления пространства: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitch = async (id: string) => {
    setSubmitting(true);
    try {
      await switchWorkspace(id);
    } catch (e) {
      console.error("[handleSwitch] ERROR:", e);
      toast.error(`Ошибка переключения пространства: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const activeIdx = storeWorkspaces.findIndex((w) => w.id === activeWorkspaceId);

  if (storeWorkspaces.length === 0) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Tabs
        value={activeIdx >= 0 ? activeIdx : 0}
        onChange={(_, v) => {
          const ws = storeWorkspaces[v];
          if (ws) handleSwitch(ws.id);
        }}
        sx={{
          minHeight: 36,
          pointerEvents: submitting ? "none" : "auto",
          opacity: submitting ? 0.5 : 1,
        }}
      >
        {storeWorkspaces.map((ws) => (
          <Tab
            key={ws.id}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {ws.name}
                <Tooltip title="Переименовать">
                  <IconButton
                    size="small"
                    aria-label="Переименовать пространство"
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
                {storeWorkspaces.length > 1 && (
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      aria-label="Удалить пространство"
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
        <IconButton size="small" onClick={() => setCreateOpen(true)} disabled={submitting} aria-label="Новое пространство">
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>
      {submitting && <CircularProgress size={16} sx={{ ml: 1 }} />}

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
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>Отмена</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim() || submitting}>
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
          <Button onClick={() => setEditId(null)} disabled={submitting}>Отмена</Button>
          <Button variant="contained" onClick={handleRename} disabled={!editName.trim() || submitting}>
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
          <Button onClick={() => setDeleteId(null)} disabled={submitting}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={submitting}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
