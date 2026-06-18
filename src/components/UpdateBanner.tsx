import { useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";
import { Close, Download } from "@mui/icons-material";
import { api, UpdateInfo } from "../core/api";

interface Props {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
}

export function UpdateBanner({ updateInfo, onDismiss }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleUpdate = async () => {
    setDownloading(true);
    try {
      await api.update.apply(updateInfo.download_url, updateInfo.asset_name);
    } catch (e: any) {
      console.error("Update failed:", e);
      setDownloading(false);
    }
  };

  return (
    <Collapse in>
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <IconButton size="small" onClick={onDismiss}>
            <Close fontSize="small" />
          </IconButton>
        }
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          Доступна новая версия: <strong>{updateInfo.latest_version}</strong>
        </Typography>
        {downloading ? (
          <Typography variant="caption" color="text.secondary">
            Скачиваем...
          </Typography>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            onClick={handleUpdate}
          >
            Обновить
          </Button>
        )}
      </Alert>
    </Collapse>
  );
}
