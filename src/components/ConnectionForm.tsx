import { useState } from 'react'
import {
    Box, TextField, Select, MenuItem, FormControl, InputLabel,
    FormControlLabel, Switch, Button, Typography, Paper
} from '@mui/material'
import { api } from '../api'
import { Connection, SaveConnectionInput } from '../types'

interface Props {
    initial: Connection | null
    onSave: () => void
    onCancel: () => void
}

export function ConnectionForm({ initial, onSave, onCancel }: Props) {
    const [form, setForm] = useState<SaveConnectionInput>({
        id: initial?.id,
        name: initial?.name ?? '',
        server: initial?.server ?? '',
        username: initial?.username ?? '',
        password: '',
        shared_secret: '',
        company: initial?.company ?? '',
        branch: initial?.branch ?? '',
        group: initial?.group ?? '',
        description: initial?.description ?? '',
        priority: initial?.priority ?? 3,
        tags: initial?.tags ?? [],
        send_all_traffic: initial?.send_all_traffic ?? false,
    })

    const f = (field: Partial<SaveConnectionInput>) => setForm(prev => ({ ...prev, ...field }))

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
                <Typography variant="overline" color="text.secondary">Категоризация</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Компания"
                            size="small"
                            fullWidth
                            value={form.company}
                            onChange={e => f({ company: e.target.value })}
                        />
                        <TextField
                            label="Филиал"
                            size="small"
                            fullWidth
                            value={form.branch}
                            onChange={e => f({ branch: e.target.value })}
                        />
                    </Box>
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
                    <TextField
                        label="Описание"
                        size="small"
                        multiline
                        rows={2}
                        value={form.description}
                        onChange={e => f({ description: e.target.value })}
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Параметры</Typography>
                <Box sx={{ mt: 1 }}>
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