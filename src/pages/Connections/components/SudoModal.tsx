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
import { useTranslation } from "react-i18next";
import type { HelperStatus } from "../../../typing/bindings";
import { appErrorMessage } from "../../../core/appErrors";

export function SudoModal({
  sudoReady,
  keychainReady,
  helperStatus,
  onAuthSudo,
  onAuthKeychain,
}: {
  sudoReady: boolean;
  keychainReady: boolean;
  helperStatus: HelperStatus;
  onAuthSudo: () => Promise<void>;
  onAuthKeychain: () => Promise<void>;
}) {
  const { t } = useTranslation();

  const statusText = (): string => {
    switch (helperStatus.kind) {
      case "idle": return t("sudoModal.waiting");
      case "updating_service_dev": return t("sudoModal.status.updatingServiceDev");
      case "starting_service": return t("sudoModal.status.startingService");
      case "install_required": return t("sudoModal.status.installRequired");
      case "running_as_admin": return t("sudoModal.status.runningAsAdmin");
      case "updating_service": return t("sudoModal.status.updatingService");
      case "updating_service_old": return t("sudoModal.status.updatingServiceOld");
      case "waiting_service": return t("sudoModal.status.waitingService", {
        attempt: helperStatus.attempt,
        retries: helperStatus.retries,
      });
      case "service_connected": return t("sudoModal.status.serviceConnected");
      case "service_not_responding": return t("sudoModal.status.serviceNotResponding");
      case "reinstalling_service": return t("sudoModal.status.reinstallingService");
    }
  };
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
      setSudoError(appErrorMessage(e));
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
      setKeychainError(appErrorMessage(e));
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
        {t("sudoModal.title")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("sudoModal.intro")}
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
            label={t("sudoModal.sudoLabel")}
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
            label={t("sudoModal.keychainLabel")}
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
                ? statusText()
                : t("sudoModal.authSudo")}
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
              {keychainLoading ? t("sudoModal.waiting") : t("sudoModal.allowKeychain")}
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
