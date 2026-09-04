import { useState } from "react";
import { Box, Button, FormControl, FormControlLabel, FormHelperText, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, TextField, Typography } from "@mui/material";
import { api } from "../../core/api";
import { Connection, ConnectionPayload, Label } from "../../typing/definitions";
import toast from "react-hot-toast";

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
    display_name: initialConnection?.display_name ?? "",
    server: initialConnection?.server ?? "",
    username: initialConnection?.username ?? "",
    password: "",
    shared_secret: "",
    labels: initialConnection?.labels ?? {},
    tunnel_mode: initialConnection?.tunnel_mode ?? "full",
    split_routes: initialConnection?.split_routes ?? [],
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
      await onSave();
    } catch (e) {
      console.error("[save] ERROR:", e);
      toast.error(`Ошибка сохранения: ${String(e)}`);
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
            label="Название"
            size="small"
            value={formData.display_name}
            onChange={(e) => updateFormData({ display_name: e.target.value })}
            placeholder="Например: Офис, Дом"
            helperText="Необязательно. Если не указано — используется Филиал, Компания или IP"
          />
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
          {labels.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              Нет меток. Создайте метки в Настройках.
            </Typography>
          ) : (
            labels.map((label) => (
              <TextField
                key={label.id}
                label={label.name}
                size="small"
                value={formData.labels[label.id] ?? ""}
                onChange={(e) => setLabel(label.id, e.target.value)}
              />
            ))
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Маршрутизация
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControl size="small">
            <RadioGroup
              value={formData.tunnel_mode}
              onChange={(e) => updateFormData({ tunnel_mode: e.target.value as "full" | "split" })}
              row
            >
              <FormControlLabel
                value="full"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">Полный туннель</Typography>
                    <Typography variant="caption" color="text.disabled">Весь трафик через VPN</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="split"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">Раздельный</Typography>
                    <Typography variant="caption" color="text.disabled">Только корпоративные сети</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {formData.tunnel_mode === "split" && (
            <Box>
              <TextField
                label="Сети через VPN"
                size="small"
                multiline
                rows={3}
                fullWidth
                value={(formData.split_routes ?? []).join("\n")}
                onChange={(e) => {
                  const routes = e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  updateFormData({ split_routes: routes });
                }}
                placeholder={"10.0.0.0/8\n192.168.50.0/24\n172.16.20.0/24"}
                helperText="Одна подсеть CIDR на строку. Интернет пойдёт напрямую."
              />
              {initialConnection?.auto_discovered_routes &&
                initialConnection.auto_discovered_routes.length > 0 &&
                (formData.split_routes ?? []).length === 0 && (
                <Button
                  size="small"
                  variant="text"
                  sx={{ mt: 1, textTransform: "none", fontSize: 12 }}
                  onClick={() => updateFormData({ split_routes: initialConnection.auto_discovered_routes })}
                >
                  Заполнить из авто-обнаруженных ({initialConnection.auto_discovered_routes.length} сетей)
                </Button>
              )}
            </Box>
          )}
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
