import {
    Box, TextField, Select, MenuItem, FormControl, InputLabel,
    Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel,
    Chip, IconButton, Tooltip, Typography, Paper
} from '@mui/material'
import { PlayArrow, Stop, Edit, Delete } from '@mui/icons-material'
import { ConnectionWithStatus, FilterState, SortDir, SortField, Connection } from '../types'

interface Props {
    connections: ConnectionWithStatus[]
    loading: boolean
    filter: FilterState
    onFilterChange: (f: FilterState) => void
    sortField: SortField
    sortDir: SortDir
    onSort: (field: SortField) => void
    companies: string[]
    branches: string[]
    groups: string[]
    allTags: string[]
    onConnect: (id: string) => void
    onDisconnect: (id: string) => void
    onEdit: (c: Connection) => void
    onDelete: (id: string) => void
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    connected: 'success',
    connecting: 'warning',
    disconnected: 'default',
    unknown: 'error',
}

const STATUS_LABEL: Record<string, string> = {
    connected: 'Подключён',
    connecting: 'Подключение...',
    disconnected: 'Отключён',
    unknown: 'Неизвестно',
}

export function ConnectionList({ connections, loading, filter, onFilterChange, ...p }: Props) {
    return (
        <Box>
            {/* Фильтры */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Поиск (имя, сервер, компания)..."
                    value={filter.search}
                    onChange={e => onFilterChange({ ...filter, search: e.target.value })}
                    sx={{ flex: 1, minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Компания</InputLabel>
                    <Select
                        value={filter.company}
                        label="Компания"
                        onChange={e => onFilterChange({ ...filter, company: e.target.value })}
                    >
                        <MenuItem value="">Все</MenuItem>
                        {p.companies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                        value={filter.priority ?? ''}
                        label="Приоритет"
                        onChange={e => {
                            const v = e.target.value as string | number
                            onFilterChange({ ...filter, priority: v === '' ? null : Number(v) })
                        }}                >
                        <MenuItem value="">Любой</MenuItem>
                        {[1, 2, 3, 4, 5].map(n => <MenuItem key={n} value={n}>P{n}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {/* Таблица */}
            <Paper variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={p.sortField === 'name'}
                                    direction={p.sortField === 'name' ? p.sortDir : 'asc'}
                                    onClick={() => p.onSort('name')}
                                >
                                    Подключение
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={p.sortField === 'status'}
                                    direction={p.sortField === 'status' ? p.sortDir : 'asc'}
                                    onClick={() => p.onSort('status')}
                                >
                                    Статус
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={p.sortField === 'priority'}
                                    direction={p.sortField === 'priority' ? p.sortDir : 'asc'}
                                    onClick={() => p.onSort('priority')}
                                >
                                    P-ty
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Сервер</TableCell>
                            <TableCell align="right">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {connections.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Нет подключений
                                </TableCell>
                            </TableRow>
                        ) : connections.map(c => (
                            <TableRow key={c.id} hover>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.company}</Typography>
                                    <Typography variant="caption" color="text.secondary">{c.branch}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={STATUS_LABEL[c.status] ?? c.status}
                                        color={STATUS_COLOR[c.status] ?? 'default'}
                                        variant={c.status === 'connected' ? 'filled' : 'outlined'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">P{c.priority}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{c.server}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                        {c.status === 'connected' ? (
                                            <Tooltip title="Отключить">
                                                <IconButton size="small" color="error" onClick={() => p.onDisconnect(c.id)}>
                                                    <Stop fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="Подключить">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => p.onConnect(c.id)}
                                                        disabled={c.status === 'connecting'}
                                                    >
                                                        <PlayArrow fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Редактировать">
                                            <IconButton size="small" onClick={() => p.onEdit(c)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Удалить">
                                            <IconButton size="small" color="error" onClick={() => p.onDelete(c.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    )
}