import { useState, useEffect, useCallback } from 'react'
import {
    AppBar, Toolbar, Typography, Button, Box, CircularProgress,
    CssBaseline, ThemeProvider, createTheme, Chip
} from '@mui/material'
import { Add, Lock, ArrowBack } from '@mui/icons-material'
import { api } from './api'
import { ConnectionList } from './components/ConnectionList'
import { ConnectionForm } from './components/ConnectionForm'
import { SudoModal } from './components/SudoModal'
import type { Connection, ConnectionWithStatus, FilterState, SortDir, SortField } from './types'

type View = 'list' | 'form'

const DEFAULT_FILTER: FilterState = {
    search: '',
    company: '',
    branch: '',
    group: '',
    tags: [],
    status: 'all',
    priority: null,
}

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        background: { default: '#121212', paper: '#1e1e1e' },
    },
    shape: { borderRadius: 8 },
})

export default function App() {
    const [connections, setConnections] = useState<ConnectionWithStatus[]>([])
    const [view, setView] = useState<View>('list')
    const [editingConn, setEditingConn] = useState<Connection | null>(null)
    const [sudoReady, setSudoReady] = useState(false)
    const [showSudoModal, setShowSudoModal] = useState(false)
    const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDir, setSortDir] = useState<SortDir>('asc')
    const [loading, setLoading] = useState(true)

    const loadConnections = useCallback(async () => {
        const conns = await api.getConnections()
        const withStatus = await Promise.all(
            conns.map(async (c) => ({
                ...c,
                status: await api.getVpnStatus(c.id).catch(() => 'unknown' as const),
            }))
        )
        setConnections(withStatus)
        setLoading(false)
    }, [])

    useEffect(() => {
        loadConnections()
        api.checkSudoSession().then(setSudoReady)
    }, [loadConnections])

    useEffect(() => {
        const interval = setInterval(async () => {
            const currentConns = await api.getConnections()
            const updated = await Promise.all(
                currentConns.map(async (c) => ({
                    ...c,
                    status: await api.getVpnStatus(c.id).catch(() => 'unknown' as const),
                }))
            )
            setConnections(updated)
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleConnect = async (id: string) => {
        if (!sudoReady) { setShowSudoModal(true); return }
        await api.connectVpn(id)
        await loadConnections()
    }

    const handleDisconnect = async (id: string) => {
        await api.disconnectVpn(id)
        await loadConnections()
    }

    const handleDelete = async (id: string) => {
        await api.deleteConnection(id)
        await loadConnections()
    }

    const handleEdit = (conn: Connection) => {
        setEditingConn(conn)
        setView('form')
    }

    const handleFormSave = async () => {
        await loadConnections()
        setView('list')
        setEditingConn(null)
    }

    const handleSudoAuth = async (password: string) => {
        await api.authenticateSudo(password)
        setSudoReady(true)
        setShowSudoModal(false)
    }

    const filtered = connections
        .filter((c) => {
            if (filter.search && !`${c.name} ${c.company} ${c.branch} ${c.server}`.toLowerCase().includes(filter.search.toLowerCase())) return false
            if (filter.company && c.company !== filter.company) return false
            if (filter.branch && c.branch !== filter.branch) return false
            if (filter.group && c.group !== filter.group) return false
            if (filter.status !== 'all' && c.status !== filter.status) return false
            if (filter.priority !== null && c.priority !== filter.priority) return false
            if (filter.tags.length > 0 && !filter.tags.every((t) => c.tags.includes(t))) return false
            return true
        })
        .sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1
            if (sortField === 'priority') return (a.priority - b.priority) * dir
            return a[sortField as keyof Connection]?.toString().localeCompare(b[sortField as keyof Connection]?.toString() ?? '') * dir
        })

    const companies = [...new Set(connections.map(c => c.company).filter(Boolean))]
    const branches = [...new Set(connections.map(c => c.branch).filter(Boolean))]
    const groups = [...new Set(connections.map(c => c.group).filter(Boolean))]
    const allTags = [...new Set(connections.flatMap(c => c.tags))]

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            {showSudoModal && (
                <SudoModal
                    onAuth={handleSudoAuth}
                    onClose={() => setShowSudoModal(false)}
                />
            )}

            <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
                        L2TP Hub
                    </Typography>

                    {!sudoReady && (
                        <Chip
                            icon={<Lock fontSize="small" />}
                            label="sudo не активен"
                            color="warning"
                            variant="outlined"
                            onClick={() => setShowSudoModal(true)}
                            sx={{ mr: 2, cursor: 'pointer' }}
                        />
                    )}

                    {view === 'list' ? (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => { setEditingConn(null); setView('form') }}
                        >
                            Добавить
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBack />}
                            onClick={() => setView('list')}
                        >
                            Назад
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : view === 'list' ? (
                    <ConnectionList
                        connections={filtered}
                        loading={loading}
                        filter={filter}
                        onFilterChange={setFilter}
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={(field) => {
                            if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                            else { setSortField(field); setSortDir('asc') }
                        }}
                        companies={companies}
                        branches={branches}
                        groups={groups}
                        allTags={allTags}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ) : (
                    <ConnectionForm
                        initial={editingConn}
                        onSave={handleFormSave}
                        onCancel={() => setView('list')}
                    />
                )}
            </Box>
        </ThemeProvider>
    )
}