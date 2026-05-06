import { useState } from 'react'
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, CircularProgress, Typography
} from '@mui/material'
import { Lock } from '@mui/icons-material'

export function SudoModal({ onAuth, onClose }: { onAuth: (p: string) => Promise<void>, onClose: () => void }) {
    const [pass, setPass] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const handle = async () => {
        setLoading(true)
        setError(false)
        try {
            await onAuth(pass)
        } catch {
            setError(true)
            setLoading(false)
        }
    }

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lock fontSize="small" />
                Sudo авторизация
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Требуется для создания VPN-сервисов в системе
                </Typography>
                <TextField
                    type="password"
                    label="Пароль"
                    size="small"
                    fullWidth
                    autoFocus
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handle()}
                    error={error}
                    helperText={error ? 'Неверный пароль' : ''}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Отмена</Button>
                <Button
                    variant="contained"
                    onClick={handle}
                    disabled={loading || !pass}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    Войти
                </Button>
            </DialogActions>
        </Dialog>
    )
}