import { useState } from 'react'
import {
    Box, TextField, Select, MenuItem, FormControl, InputLabel,
    FormControlLabel, Switch, Button, Typography, Paper
} from '@mui/material'
import { api } from '../api'
import { Connection, SaveConnectionInput, Label } from '../types'

interface Props {
    initial: Connection | null
    labels: Label[]
    onSave: () => void
    onCancel: () => void
}

export function ConnectionForm({ initial, labels, onSave, onCancel }: Props) {
    const [form, setForm] = useState<SaveConnectionInput>({
        id: initial?.id,
        server: initial?.server ?? '',
        username: initial?.username ?? '',
        password: '',
        shared_secret: '',
        priority: initial?.priority ?? 3,
        send_all_traffic: initial?.send_all_traffic ?? false,
        labels: initial?.labels ?? {},
    })

    const f = (field: Partial<SaveConnectionInput>) => setForm(prev => ({ ...prev, ...field }))
    const setLabel = (id: string, value: string) =>
        setForm(prev => ({ ...prev, labels: { ...prev.labels, [id]: value } }))

    const save = async () => {
        await api.saveConnection(form)
        onSave()
    }

    return (
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
                {initial ? 'Редактировать подключение' : 'Новое подключение'}
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Подключение</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Сервер"
                        size="small"
                        required
                        value={form.server}
                        onChange={e => f({ server: e.target.value })}
                    />
                    <TextField
                        label="Username"
                        size="small"
                        value={form.username}
                        onChange={e => f({ username: e.target.value })}
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        size="small"
                        value={form.password}
                        onChange={e => f({ password: e.target.value })}
                    />
                    <TextField
                        label="Shared Secret"
                        type="password"
                        size="small"
                        value={form.shared_secret}
                        onChange={e => f({ shared_secret: e.target.value })}
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Метки</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {labels.map(label => (
                        <TextField
                            key={label.id}
                            label={label.name}
                            size="small"
                            value={form.labels[label.id] ?? ''}
                            onChange={e => setLabel(label.id, e.target.value)}
                        />
                    ))}
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Параметры</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <FormControl size="small">
                        <InputLabel>Приоритет</InputLabel>
                        <Select
                            value={form.priority}
                            label="Приоритет"
                            onChange={e => f({ priority: Number(e.target.value) })}
                        >
                            {[1, 2, 3, 4, 5].map(n => (
                                <MenuItem key={n} value={n}>P{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.send_all_traffic}
                                onChange={e => f({ send_all_traffic: e.target.checked })}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body2">Весь трафик через VPN</Typography>
                                <Typography variant="caption" color="text.secondary">Default gateway (GW)</Typography>
                            </Box>
                        }
                    />
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={onCancel}>Отмена</Button>
                <Button variant="contained" onClick={save}>Сохранить</Button>
            </Box>
        </Box>
    )
}