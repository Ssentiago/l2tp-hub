import { useState, useEffect } from "react";
import { useStore } from "../../store";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  DialogContentText,
  CircularProgress,
} from "@mui/material";
import {
  Delete,
  Add,
  Lock,
  FileUpload,
  FileDownload,
  DeleteForever,
  SystemUpdate,
} from "@mui/icons-material";
import { api } from "../../core/api";
import type { UpdateInfo } from "../../core/api";
import toast from "react-hot-toast";

export function Settings() {
  const {
    labels,
    saveLabel,
    deleteLabel,
    loadLabels,
  } = useStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [labelsSubmitting, setLabelsSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"export" | "import">("export");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const RESET_WORD = "СБРОС";

  useEffect(() => {
    loadLabels();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLabelsSubmitting(true);
    try {
      const id = newName.trim().toLowerCase().replace(/\s+/g, "_");
      await saveLabel(id, newName.trim());
      setNewName("");
      toast.success("Метка добавлена");
    } catch (e) {
      console.error("[handleAdd label] ERROR:", e);
    } finally {
      setLabelsSubmitting(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setLabelsSubmitting(true);
    try {
      await saveLabel(id, editingName.trim());
      setEditingId(null);
      toast.success("Метка переименована");
    } catch (e) {
      console.error("[handleRename label] ERROR:", e);
    } finally {
      setLabelsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLabelsSubmitting(true);
    try {
      await deleteLabel(id);
      toast.success("Метка удалена");
    } catch (e) {
      console.error("[handleDelete label] ERROR:", e);
    } finally {
      setLabelsSubmitting(false);
    }
  };

  const openDialog = (mode: "export" | "import") => {
    setDialogMode(mode);
    setPassword("");
    setError(null);
    setSuccess(null);
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!password.trim()) return;
    setError(null);
    try {
      if (dialogMode === "export") {
        const saved = await api.config.export(password);
        if (saved) {
          setSuccess("Конфигурация экспортирована");
          setDialogOpen(false);
        }
      } else {
        const imported = await api.config.import(password);
        if (imported) {
          setSuccess("Конфигурация импортирована");
          await loadLabels();
          setDialogOpen(false);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.config.reset();
      await loadLabels();
      setSuccess("Все данные сброшены");
      setResetOpen(false);
      setResetConfirmText("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setResetting(false);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateChecking(true);
    setUpdateError(null);
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      const version = await getVersion();
      const update = await api.update.check(version);
      if (update) {
        setUpdateInfo(update);
        setUpdateDialogOpen(true);
      } else {
        setUpdateSuccess("Установлена последняя версия");
      }
    } catch (e: any) {
      setUpdateError(e?.message ?? String(e));
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;
    setUpdateDownloading(true);
    try {
      await api.update.apply(updateInfo.download_url, updateInfo.asset_name);
    } catch (e: any) {
      setUpdateError(e?.message ?? String(e));
      setUpdateDownloading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Настройки
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Конфигурация
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Экспорт и импорт всех подключений и меток, включая пароли. Файл
          шифруется паролем.
        </Typography>
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={() => openDialog("export")}
            fullWidth
          >
            Экспорт
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={() => openDialog("import")}
            fullWidth
          >
            Импорт
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Метки
        </Typography>
        {labelsSubmitting && (
          <CircularProgress size={14} sx={{ ml: 1, verticalAlign: "middle" }} />
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Поля для категоризации подключений. Встроенные метки нельзя удалить.
          Метки общие для всех пространств. Подключения и группировка — свои в каждом пространстве.
        </Typography>

        <List disablePadding>
          {labels.map((label, i) => (
            <Box key={label.id}>
              {i > 0 && <Divider />}
              <ListItem
                disablePadding
                sx={{ py: 1, gap: 1 }}
                secondaryAction={
                  <Tooltip
                    title={label.built_in ? "Встроенная метка" : "Удалить"}
                  >
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={label.built_in || labelsSubmitting}
                        onClick={() => handleDelete(label.id)}
                      >
                        {label.built_in ? (
                          <Lock fontSize="small" />
                        ) : (
                          <Delete fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                }
              >
                {editingId === label.id ? (
                  <TextField
                    size="small"
                    autoFocus
                    value={editingName}
                    disabled={labelsSubmitting}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRename(label.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(label.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    sx={{ flex: 1, mr: 5 }}
                  />
                ) : (
                  <ListItemText
                    primary={label.name}
                    secondary={label.built_in ? "встроенная" : null}
                    onClick={() => {
                      if (!label.built_in) {
                        setEditingId(label.id);
                        setEditingName(label.name);
                      }
                    }}
                    sx={{
                      cursor: label.built_in ? "default" : "pointer",
                      "&:hover": { opacity: label.built_in ? 1 : 0.7 },
                    }}
                  />
                )}
              </ListItem>
      {/* Update dialog */}
      <Dialog
        open={updateDialogOpen}
        onClose={() => !updateDownloading && setUpdateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Доступно обновление</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Новая версия: <strong>{updateInfo?.latest_version}</strong>
          </DialogContentText>
          {updateDownloading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Скачиваем...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUpdateDialogOpen(false)}
            disabled={updateDownloading}
          >
            Позже
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyUpdate}
            disabled={updateDownloading}
          >
            Установить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Название новой метки"
            value={newName}
            disabled={labelsSubmitting}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAdd}
            disabled={!newName.trim() || labelsSubmitting}
          >
            Добавить
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Обновления
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Проверить наличие новой версии приложения.
        </Typography>
        {updateError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError(null)}>
            {updateError}
          </Alert>
        )}
        {updateSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUpdateSuccess(null)}>
            {updateSuccess}
          </Alert>
        )}
        <Button
          variant="outlined"
          startIcon={updateChecking ? <CircularProgress size={16} /> : <SystemUpdate />}
          onClick={handleCheckUpdate}
          disabled={updateChecking}
          fullWidth
        >
          {updateChecking ? "Проверяем..." : "Проверить обновления"}
        </Button>
      </Paper>

      <Paper
        variant="outlined"
        sx={{ p: 3, borderColor: (theme) => theme.palette.error.dark }}
      >
        <Typography variant="overline" sx={{ color: "error.main" }}>
          Опасная зона
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Удаляет все подключения и пользовательские метки. Встроенные метки
          сохраняются. Действие необратимо.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForever />}
          onClick={() => {
            setResetOpen(true);
            setResetConfirmText("");
          }}
        >
          Сбросить все данные
        </Button>
      </Paper>

      {/* Export/Import dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "export"
            ? "Экспорт конфигурации"
            : "Импорт конфигурации"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {dialogMode === "export"
              ? "Файл будет зашифрован этим паролем. Без него восстановление невозможно."
              : "Введите пароль, которым был зашифрован файл при экспорте."}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!password.trim()}
          >
            {dialogMode === "export" ? "Экспортировать" : "Импортировать"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset dialog */}
      <Dialog
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>
          Сброс всех данных
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Будут удалены все подключения и пользовательские метки. Сохранённые
            пароли будут удалены из системного хранилища ключей. Это действие
            необратимо.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            Для подтверждения введите <strong>{RESET_WORD}</strong>:
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              resetConfirmText === RESET_WORD &&
              handleReset()
            }
            error={
              resetConfirmText.length > 0 && resetConfirmText !== RESET_WORD
            }
            disabled={resetting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)} disabled={resetting}>
            Отмена
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReset}
            disabled={resetConfirmText !== RESET_WORD || resetting}
          >
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
