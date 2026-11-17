import { commands } from "../typing/bindings";

export const api = {
  connections: {
    getAll: () => commands.getConnections(),
    save: (input: Parameters<typeof commands.saveConnection>[0]) =>
      commands.saveConnection(input),
    delete: (id: string) => commands.deleteConnection(id),
  },
  vpn: {
    connect: (id: string) => commands.connectVpn(id),
    disconnect: (id: string) => commands.disconnectVpn(id),
    getStatus: (id: string) => commands.getVpnStatus(id),
    getAllStatuses: () => commands.getAllVpnStatuses(),
    check: (id: string) => commands.checkConnection(id),
    switchTunnelMode: (id: string, newMode: Parameters<typeof commands.switchTunnelMode>[1]) =>
      commands.switchTunnelMode(id, newMode),
  },
  logs: {
    getHistory: (id: string) => commands.getConnectionHistory(id),
    getSession: (id: string, timestamp: number) =>
      commands.getSessionLogs(id, timestamp),
  },
  sudo: {
    authenticate: () => commands.authenticateSudo(),
    checkSession: () => commands.checkSudoSession(),
    checkHelper: () => commands.checkHelperStatus(),
    getHelperStatus: () => commands.getHelperStatus(),
  },
  labels: {
    getAll: () => commands.getLabels(),
    save: (id: string, name: string) => commands.saveLabel(id, name),
    delete: (id: string) => commands.deleteLabel(id),
  },
  app: {
    openUrl: (url: string) => commands.openUrl(url),
  },
  system: {
    checkKeychainAccess: () => commands.checkKeychainAccess(),
    quitApp: () => commands.quitApp(),
  },
  config: {
    import: (password: string) => commands.import(password),
    importFile: (filePath: string, password: string) =>
      commands.importFile(filePath, password),
    export: (password: string) => commands.export(password),
    reset: () => commands.reset(),
  },
  update: {
    check: (currentVersion: string) => commands.checkUpdate(currentVersion),
    apply: (downloadUrl: string, assetName: string) =>
      commands.applyUpdate(downloadUrl, assetName),
  },
  workspaces: {
    list: () => commands.getWorkspaces(),
    getActiveId: () => commands.getActiveWorkspaceId(),
    create: (name: string) => commands.createWorkspace(name),
    rename: (id: string, name: string) => commands.renameWorkspace(id, name),
    delete: (id: string) => commands.deleteWorkspace(id),
    switch: (id: string) => commands.switchWorkspace(id),
  },
};
