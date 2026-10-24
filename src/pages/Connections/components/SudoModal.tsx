import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { Lock, VpnKey, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";

export function SudoModal({
  sudoReady,
  keychainReady,
  helperStatusText,
  onAuthSudo,
  onAuthKeychain,
}: {
  sudoReady: boolean;
  keychainReady: boolean;
  helperStatusText: string;
  onAuthSudo: () => Promise<void>;
  onAuthKeychain: () => Promise<void>;
}) {
  const [sudoLoading, setSudoLoading] = useState(false);
  const [sudoError, setSudoError] = useState<string | null>(null);
  const [keychainLoading, setKeychainLoading] = useState(false);
  const [keychainError, setKeychainError] = useState<string | null>(null);

  const handleSudo = async () => {
    setSudoLoading(true);
    setSudoError(null);
    try {
      await onAuthSudo();
    } catch (e) {
      setSudoError(String(e));
    } finally {
      setSudoLoading(false);
    }
  };

  const handleKeychain = async () => {
    setKeychainLoading(true);
    setKeychainError(null);
    try {
      await onAuthKeychain();
    } catch (e) {
      setKeychainError(String(e));
    } finally {
      setKeychainLoading(false);
    }
  };

  return (
    <Dialog
      open
      maxWidth="xs"
      fullWidth
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Lock fontSize="small" />
        Требуется настройка
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Для работы приложения необходимо два условия:
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={sudoReady}
                disabled
                icon={<RadioButtonUnchecked />}
                checkedIcon={<CheckCircle color="success" />}
              />
            }
            label="Права администратора (sudo)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={keychainReady}
                disabled
                icon={<RadioButtonUnchecked />}
                checkedIcon={<CheckCircle color="success" />}
              />
            }
            label="Доступ к связке ключей"
          />
        </Stack>

        {!sudoReady && (
          <>
            <Button
              variant="contained"
              onClick={handleSudo}
              disabled={sudoLoading}
              fullWidth
              sx={{ mb: 1 }}
              startIcon={
                sudoLoading ? <CircularProgress size={16} /> : <Lock fontSize="small" />
              }
            >
              {sudoLoading
                ? (helperStatusText || "Ожидание...")
                : "Авторизоваться (сервис)"
              }
            </Button>
            {sudoError && (
              <Alert severity="error" sx={{ mb: 1 }}>{sudoError}</Alert>
            )}
          </>
        )}

        {!keychainReady && (
          <>
            <Button
              variant="contained"
              onClick={handleKeychain}
              disabled={keychainLoading}
              fullWidth
              sx={{ mb: 1 }}
              startIcon={
                keychainLoading ? <CircularProgress size={16} /> : <VpnKey fontSize="small" />
              }
            >
              {keychainLoading ? "Ожидание..." : "Разрешить доступ к связке ключей"}
            </Button>
            {keychainError && (
              <Alert severity="error" sx={{ mb: 1 }}>{keychainError}</Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
