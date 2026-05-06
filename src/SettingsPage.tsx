import { useState } from 'react'
import {
    Box, Typography, Paper, TextField, IconButton,
    List, ListItem, ListItemText, Tooltip, Button, Divider
} from '@mui/material'
import { Delete, Add, Lock } from '@mui/icons-material'
import { api } from './api'
import { Label } from './types'

interface Props {
    labels: Label[]
    onLabelsChange: () => void
}

export function SettingsPage({ labels, onLabelsChange }: Props) {
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')

    const handleAdd = async () => {
        if (!newName.trim()) return
        const id = newName.trim().toLowerCase().replace(/\s+/g, '_')
        await api.saveLabel(id, newName.trim())
        setNewName('')
        onLabelsChange()
    }

    const handleRename = async (id: string) => {
        if (!editingName.trim()) return
        await api.saveLabel(id, editingName.trim())
        setEditingId(null)
        onLabelsChange()
    }

    const handleDelete = async (id: string) => {
        await api.deleteLabel(id)
        onLabelsChange()
    }

    return (
        <Box sx={{ maxWidth: 480, mx: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Настройки</Typography>

            <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary">Метки</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Поля для категоризации подключений. Встроенные метки нельзя удалить.
                </Typography>

                <List disablePadding>
                    {labels.map((label, i) => (
                        <Box key={label.id}>
                            {i > 0 && <Divider />}
                            <ListItem
                                disablePadding
                                sx={{ py: 1, gap: 1 }}
                                secondaryAction={
                                    <Tooltip title={label.built_in ? 'Встроенная метка' : 'Удалить'}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                disabled={label.built_in}
                                                onClick={() => handleDelete(label.id)}
                                            >
                                                {label.built_in ? <Lock fontSize="small" /> : <Delete fontSize="small" />}
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
                                        onChange={e => setEditingName(e.target.value)}
                                        onBlur={() => handleRename(label.id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRename(label.id)
                                            if (e.key === 'Escape') setEditingId(null)
                                        }}
                                        sx={{ flex: 1, mr: 5 }}
                                    />
                                ) : (
                                    <ListItemText
                                        primary={label.name}
                                        secondary={label.built_in ? 'встроенная' : null}
                                        onClick={() => {
                                            if (!label.built_in) {
                                                setEditingId(label.id)
                                                setEditingName(label.name)
                                            }
                                        }}
                                        sx={{
                                            cursor: label.built_in ? 'default' : 'pointer',
                                            '&:hover': { opacity: label.built_in ? 1 : 0.7 },
                                        }}
                                    />
                                )}
                            </ListItem>
                        </Box>
                    ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Название новой метки"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                    >
                        Добавить
                    </Button>
                </Box>
            </Paper>
        </Box>
    )
}