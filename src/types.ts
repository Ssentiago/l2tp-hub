export interface Connection {
    id: string
    name: string
    server: string
    username: string
    keychain_key: string
    shared_secret_key: string

    // Категоризация
    company: string
    branch: string
    tags: string[]
    description: string
    group: string
    priority: number // 1-5

    // Технические параметры
    send_all_traffic: boolean
}

export type VpnStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown'

export interface ConnectionWithStatus extends Connection {
    status: VpnStatus
}

export interface SaveConnectionInput {
    id?: string
    name: string
    server: string
    username: string
    password: string
    shared_secret: string
    company: string
    branch: string
    tags: string[]
    description: string
    group: string
    priority: number
    send_all_traffic: boolean
}

export interface FilterState {
    search: string
    company: string
    branch: string
    group: string
    tags: string[]
    status: VpnStatus | 'all'
    priority: number | null
}

export type SortField = 'name' | 'company' | 'branch' | 'priority' | 'status'
export type SortDir = 'asc' | 'desc'