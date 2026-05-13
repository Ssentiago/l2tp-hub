import {useState} from "react";
import {
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Switch,
    Button,
    Typography,
    Paper,
} from "@mui/material";
import {api} from "../../core/api";
import {Connection, ConnectionFormData, Label} from "../../typing/definitions";

interface Props {
    initial: Connection | null;
    labels: Label[];
    onSave: () => void;
    onCancel: () => void;
}

export function ConnectionForm({initial, labels, onSave, onCancel}: Props) {
    const [form, setForm] = useState<ConnectionFormData>({
        id: initial?.id,
        server: initial?.server ?? "",
        username: initial?.username ?? "",
        password: "",
        shared_secret: "",
        priority: initial?.priority ?? 3,
        send_all_traffic: true,
        labels: initial?.labels ?? {},
    });

    const f = (field: Partial<ConnectionFormData>) =>
        setForm((prev) => ({...prev, ...field}));
    const setLabel = (id: string, value: string) =>
        setForm((prev) => ({...prev, labels: {...prev.labels, [id]: value}}));

    const save = async () => {
        await api.connections.save(form);
        onSave();
    };

    return (
        <Box sx={{maxWidth: 560, mx: "auto"}}>
            <Typography variant="h6" sx={{mb: 3}}>
                {initial ? "Редактировать подключение" : "Новое подключение"}
            </Typography>

            <Paper variant="outlined" sx={{p: 3, mb: 2}}>
                <Typography variant="overline" color="text.secondary">
                    Подключение
                </Typography>
                <Box sx={{display: "flex", flexDirection: "column", gap: 2, mt: 1}}>
                    <TextField
                        label="Сервер"
                        size="small"
                        required
                        value={form.server}
                        onChange={(e) => f({server: e.target.value})}
                    />
                    <TextField
                        label="Имя пользователя"
                        size="small"
                        value={form.username}
                        onChange={(e) => f({username: e.target.value})}
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        size="small"
                        value={form.password}
                        onChange={(e) => f({password: e.target.value})}
                        placeholder={initial ? "Оставьте пустым, чтобы не менять" : ""}
                        helperText={
                            initial && !form.password ? "Текущий пароль сохранён" : undefined
                        }
                    />
                    <TextField
                        label="Общий ключ"
                        type="password"
                        size="small"
                        value={form.shared_secret}
                        onChange={(e) => f({shared_secret: e.target.value})}
                        placeholder={initial ? "Оставьте пустым, чтобы не менять" : ""}
                        helperText={
                            initial && !form.shared_secret
                                ? "Текущий ключ сохранён"
                                : undefined
                        }
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{p: 3, mb: 2}}>
                <Typography variant="overline" color="text.secondary">
                    Метки
                </Typography>
                <Box sx={{display: "flex", flexDirection: "column", gap: 2, mt: 1}}>
                    {labels.map((label) => (
                        <TextField
                            key={label.id}
                            label={label.name}
                            size="small"
                            value={form.labels[label.id] ?? ""}
                            onChange={(e) => setLabel(label.id, e.target.value)}
                        />
                    ))}
                </Box>
            </Paper>

            <Box sx={{display: "flex", gap: 2, justifyContent: "flex-end"}}>
                <Button variant="outlined" onClick={onCancel}>
                    Отмена
                </Button>
                <Button variant="contained" onClick={save}>
                    Сохранить
                </Button>
            </Box>
        </Box>
    );
}
