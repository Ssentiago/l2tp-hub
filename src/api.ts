import { invoke } from '@tauri-apps/api/core'
import type { Connection, SaveConnectionInput, VpnStatus, Label } from './types'

export const api = {
    getConnections: () =>
        invoke<Connection[]>('get_connections'),

    saveConnection: (input: SaveConnectionInput) =>
        invoke<Connection>('save_connection', { input }),

    deleteConnection: (id: string) =>
        invoke<void>('delete_connection', { id }),

    connectVpn: (id: string) =>
        invoke<void>('connect_vpn', { id }),

    disconnectVpn: (id: string) =>
        invoke<void>('disconnect_vpn', { id }),

    getVpnStatus: (id: string) =>
        invoke<VpnStatus>('get_vpn_status', { id }),

    authenticateSudo: (password: string) =>
        invoke<void>('authenticate_sudo', { password }),

    checkSudoSession: () =>
        invoke<boolean>('check_sudo_session'),

    getLabels: () =>
        invoke<Label[]>('get_labels'),

    saveLabel: (id: string, name: string) =>
        invoke<Label>('save_label', { id, name }),

    deleteLabel: (id: string) =>
        invoke<void>('delete_label', { id }),

    openUrl: (url: string) => {
        invoke<void>("open_url", {url})
    }
}