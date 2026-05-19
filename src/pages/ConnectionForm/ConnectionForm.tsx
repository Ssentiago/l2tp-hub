import { useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { api } from "../../core/api";
import { Connection, ConnectionPayload, Label } from "../../typing/definitions";

interface ConnectionFormProps {
  initialConnection: Connection | null;
  labels: Label[];
  onSave: () => void;
  onCancel: () => void;
}

export function ConnectionForm({
  initialConnection,
  labels,
  onSave,
  onCancel,
}: ConnectionFormProps) {
  const [formData, setFormData] = useState<ConnectionPayload>({
    id: initialConnection?.id,
    server: initialConnection?.server ?? "",
    username: initialConnection?.username ?? "",
    password: "",
    shared_secret: "",
    labels: initialConnection?.labels ?? {},
  });

  const [saving, setSaving] = useState(false);

  const updateFormData = (field: Partial<ConnectionPayload>) =>
    setFormData((prev) => ({ ...prev, ...field }));

  const setLabel = (id: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      labels: { ...prev.labels, [id]: value },
    }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.connections.save(formData);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {initialConnection ? "Редактировать подключение" : "Новое подключение"}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Подключение
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Сервер"
            size="small"
            required
            value={formData.server}
            onChange={(e) => updateFormData({ server: e.target.value })}
          />
          <TextField
            label="Имя пользователя"
            size="small"
            value={formData.username}
            onChange={(e) => updateFormData({ username: e.target.value })}
          />
          <TextField
            label="Пароль"
            type="password"
            size="small"
            value={formData.password}
            onChange={(e) => updateFormData({ password: e.target.value })}
            placeholder={
              initialConnection ? "Оставьте пустым, чтобы не менять" : ""
            }
            helperText={
              initialConnection && !formData.password
                ? "Текущий пароль сохранён"
                : undefined
            }
          />
          <TextField
            label="Общий ключ"
            type="password"
            size="small"
            value={formData.shared_secret}
            onChange={(e) => updateFormData({ shared_secret: e.target.value })}
            placeholder={
              initialConnection ? "Оставьте пустым, чтобы не менять" : ""
            }
            helperText={
              initialConnection && !formData.shared_secret
                ? "Текущий ключ сохранён"
                : undefined
            }
          />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Метки
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {labels.map((label) => (
            <TextField
              key={label.id}
              label={label.name}
              size="small"
              value={formData.labels[label.id] ?? ""}
              onChange={(e) => setLabel(label.id, e.target.value)}
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Сохранить
        </Button>
      </Box>
    </Box>
  );
}
