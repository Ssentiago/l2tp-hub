import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Lock, Terminal } from "@mui/icons-material";

export function SudoModal({
  onAuth,
  onClose,
}: {
  onAuth: (p: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handle = async () => {
    setLoading(true);
    setError(false);
    try {
      await onAuth(pass);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Lock fontSize="small" />
        Требуется авторизация
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Для управления VPN-подключениями приложение использует системные
          утилиты <code>networksetup</code> и <code>scutil</code>, которые
          требуют прав администратора.
        </Typography>

        <Alert
          severity="info"
          icon={<Terminal fontSize="small" />}
          sx={{ mb: 2 }}
        >
          Пароль используется только для выполнения команд через
          <code>sudo</code> и хранится в памяти до закрытия приложения.
        </Alert>

        <TextField
          type="password"
          label="Пароль системного пользователя"
          size="small"
          fullWidth
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handle()}
          error={error}
          helperText={error ? "Неверный пароль" : ""}
        />
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
        <Button
          variant="contained"
          onClick={handle}
          disabled={loading || !pass}
          startIcon={
            loading ? <CircularProgress size={16} /> : <Lock fontSize="small" />
          }
        >
          Авторизоваться
        </Button>
      </DialogActions>
    </Dialog>
  );
}
