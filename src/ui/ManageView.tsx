import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  ContentCopy,
  Article,
} from "@mui/icons-material";
import { useStore } from "../store";
import { api } from "../core/api";
import type { ConnectionWithStatus, Connection } from "../typing/definitions";
import { getTitle } from "../core/display";
import { StatusDot } from "./StatusDot";
import { ModeSegment } from "./ModeSegment";
import { SubnetEditor } from "../components/SubnetEditor";
import { ConnectionLogDrawer } from "../pages/Connections/components/ConnectionLogDrawer";

// ——— Tree ———

interface TreeItem {
  id: string;
  label: string;
  depth: number;
  children: TreeItem[];
  connId?: string;
  isWorkspace?: boolean;
  workspaceId?: string;
}

function buildTree(conns: ConnectionWithStatus[], workspaceName: string): TreeItem {
  const companies = new Map<string, Map<string, ConnectionWithStatus[]>>();
  for (const c of conns) {
    const co = c.labels["company"] ?? "";
    const br = c.labels["branch"] ?? "";
    if (!companies.has(co)) companies.set(co, new Map());
    const branches = companies.get(co)!;
    if (!branches.has(br)) branches.set(br, []);
    branches.get(br)!.push(c);
  }
  const children: TreeItem[] = [];
  for (const [co, branches] of [...companies.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const branchKeys = [...branches.keys()].filter((b) => b);
    if (branchKeys.length <= 1) {
      const br = branchKeys[0] ?? "";
      const connsList = branches.get(br) ?? [];
      const label = co && br ? `${co} · ${br}` : co || br || "Без группы";
      children.push({
        id: `co-${co}-${br}`,
        label,
        depth: 1,
        children: connsList.map((c) => ({
          id: c.id,
          label: getTitle(c),
          depth: 2,
          connId: c.id,
          children: [],
        })),
      });
    } else {
      const branchChildren: TreeItem[] = [];
      for (const [br, connsList] of [...branches.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (!br) continue;
        branchChildren.push({
          id: `br-${co}-${br}`,
          label: br,
          depth: 2,
          children: connsList.map((c) => ({
            id: c.id,
            label: getTitle(c),
            depth: 3,
            connId: c.id,
            children: [],
          })),
        });
      }
      children.push({
        id: `co-${co}`,
        label: co || "Без группы",
        depth: 1,
        children: branchChildren,
      });
    }
  }
  return {
    id: "ws-root",
    label: workspaceName,
    depth: 0,
    children,
    isWorkspace: true,
  };
}

function flattenTree(items: TreeItem[], expanded: Set<string>): TreeItem[] {
  const result: TreeItem[] = [];
  const walk = (list: TreeItem[]) => {
    for (const item of list) {
      result.push(item);
      if (item.children.length > 0 && expanded.has(item.id)) walk(item.children);
    }
  };
  walk(items);
  return result;
}

// ——— ManageView ———

export function ManageView() {
  const {
    connections,
    selectedKey,
    setSelectedKey,
    setViewMode,
    connectVpn,
    disconnectVpn,
    loadConnections,
    deleteConnection,
    setQuery,
    workspaces,
    activeWorkspaceId,
    renameWorkspace,
    deleteWorkspace,
    createWorkspace,
  } = useStore();

  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ws-root"]));
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [creating, setCreating] = useState(false);
  const [wsCtxMenu, setWsCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [wsRenameOpen, setWsRenameOpen] = useState(false);
  const [wsRenameVal, setWsRenameVal] = useState("");
  const [wsDeleteOpen, setWsDeleteOpen] = useState(false);
  const [connCtxMenu, setConnCtxMenu] = useState<{ x: number; y: number; connId: string } | null>(null);

  const wsName = workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "";
  const tree = useMemo(() => buildTree(connections, wsName), [connections, wsName]);
  const flat = useMemo(() => flattenTree([tree], expanded), [tree, expanded]);
  const selectedConnId = selectedKey ? selectedKey.split(":").slice(1).join(":") : null;
  const selected = connections.find((c) => c.id === selectedConnId) ?? null;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (deleteTarget) {
      await deleteConnection(deleteTarget);
      if (selectedConnId === deleteTarget) setSelectedKey(null);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteConnection, selectedConnId, setSelectedKey]);

  const handleNewConnection = useCallback(() => {
    setCreating(true);
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      {/* ——— Left panel ——— */}
      <Box
        sx={{
          width: 240,
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 1, gap: 0.5 }}>
          <Tooltip title="Назад к палитре (Esc)">
            <IconButton size="small" onClick={() => { setViewMode("palette"); setQuery(""); }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1, color: "text.secondary" }}>Управление</Typography>
          <Tooltip title="Новое подключение (⌘N)">
            <IconButton size="small" onClick={handleNewConnection}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {flat.map((item) => (
            <Box
              key={item.id}
              onClick={() => {
                if (item.connId) setSelectedKey(`manage:${item.connId}`);
                else if (item.children.length > 0) toggleExpand(item.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (item.connId) setConnCtxMenu({ x: e.clientX, y: e.clientY, connId: item.connId });
                else if (item.isWorkspace) setWsCtxMenu({ x: e.clientX, y: e.clientY });
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                height: 32,
                pl: item.depth * 1.5 + 1,
                pr: 1,
                cursor: "pointer",
                bgcolor: item.connId === selectedConnId ? "rgba(255,255,255,0.06)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
                gap: 0.75,
              }}
            >
              {item.children.length > 0 ? (
                <Typography sx={{ fontSize: 11, color: "text.secondary", width: 12, textAlign: "center", lineHeight: 1 }}>
                  {expanded.has(item.id) ? "▾" : "▸"}
                </Typography>
              ) : (
                <Box sx={{ width: 12 }} />
              )}
              {item.connId && (
                <StatusDot status={connections.find((c) => c.id === item.connId)?.status ?? "unknown"} />
              )}
              <Typography
                sx={{
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: item.connId === selectedConnId ? 500 : 400,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ——— Right panel ——— */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {creating ? (
          <NewConnectionForm
            onDone={() => {
              setCreating(false);
              loadConnections();
            }}
            onCancel={() => setCreating(false)}
          />
        ) : selected ? (
          <>
            {/* Header */}
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 600 }}>{getTitle(selected)}</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>{selected.server}</Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <ModeSegment
                  value={selected.tunnel_mode}
                  size="md"
                  disabledModes={selected.split_routes.length === 0 ? ["split"] : []}
                  onChange={async (mode) => {
                    if (selected.status === "connected") {
                      await api.vpn.switchTunnelMode(selected.id, mode);
                    } else {
                      await api.connections.save({
                        id: selected.id,
                        display_name: selected.display_name,
                        server: selected.server,
                        username: selected.username,
                        password: "",
                        shared_secret: "",
                        labels: selected.labels,
                        tunnel_mode: mode,
                        split_routes: selected.split_routes,
                      });
                    }
                    await loadConnections();
                  }}
                />
                <Button
                  variant="contained"
                  color={selected.status === "connected" ? "error" : "primary"}
                  onClick={() => {
                    if (selected.status === "connected") disconnectVpn(selected.id);
                    else connectVpn(selected.id);
                  }}
                >
                  {selected.status === "connected" ? "Отключить" : "Подключить"}
                </Button>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Логи сессий">
                  <IconButton size="small" onClick={() => setShowLog(true)}>
                    <Article fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Копировать ID">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(selected.id)}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Tab label="Параметры" />
              <Tab label="Маршруты" />
              <Tab label="Логи" />
            </Tabs>

            <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
              {detailTab === 0 && (
                <ParamsForm
                  conn={selected}
                  onSaved={() => loadConnections()}
                />
              )}
              {detailTab === 1 && (
                <RoutesEditor conn={selected} onSaved={() => loadConnections()} />
              )}
              {detailTab === 2 && (
                <Box>
                  <Typography sx={{ color: "text.secondary", mb: 2 }}>
                    История сессий и логи подключения.
                  </Typography>
                  <Button variant="outlined" startIcon={<Article />} onClick={() => setShowLog(true)}>
                    Открыть логи
                  </Button>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 1 }}>
            <Typography sx={{ color: "text.disabled" }}>Выберите подключение</Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={handleNewConnection}>
              Создать новое
            </Button>
          </Box>
        )}
      </Box>

      {/* ——— Connection context menu ——— */}
      {connCtxMenu && (
        <>
          <Box sx={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setConnCtxMenu(null)} />
          <Box
            sx={{
              position: "fixed",
              top: connCtxMenu.y,
              left: connCtxMenu.x,
              zIndex: 9999,
              bgcolor: "#2a2a2a",
              borderRadius: 1,
              boxShadow: 4,
              minWidth: 160,
              py: 0.5,
            }}
          >
            {[
              {
                label: "Копировать ID",
                icon: <ContentCopy fontSize="small" />,
                action: () => navigator.clipboard.writeText(connCtxMenu.connId),
              },
              {
                label: "Удалить",
                icon: <Delete fontSize="small" />,
                action: () => setDeleteTarget(connCtxMenu.connId),
                danger: true,
              },
            ].map((item) => (
              <Box
                key={item.label}
                onClick={() => {
                  item.action();
                  setConnCtxMenu(null);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  cursor: "pointer",
                  fontSize: 13,
                  color: item.danger ? "error.main" : "text.primary",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                {item.icon}
                {item.label}
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* ——— Workspace context menu ——— */}
      {wsCtxMenu && (
        <>
          <Box sx={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setWsCtxMenu(null)} />
          <Box
            sx={{
              position: "fixed",
              top: wsCtxMenu.y,
              left: wsCtxMenu.x,
              zIndex: 9999,
              bgcolor: "#2a2a2a",
              borderRadius: 1,
              boxShadow: 4,
              minWidth: 160,
              py: 0.5,
            }}
          >
            {[
              {
                label: "Переименовать",
                icon: <Edit fontSize="small" />,
                action: () => {
                  setWsRenameVal(wsName);
                  setWsRenameOpen(true);
                },
              },
              {
                label: "Удалить воркспейс",
                icon: <Delete fontSize="small" />,
                action: () => setWsDeleteOpen(true),
                danger: true,
              },
            ].map((item) => (
              <Box
                key={item.label}
                onClick={() => {
                  item.action();
                  setWsCtxMenu(null);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  cursor: "pointer",
                  fontSize: 13,
                  color: item.danger ? "error.main" : "text.primary",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                {item.icon}
                {item.label}
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* ——— Workspace rename dialog ——— */}
      <Dialog open={wsRenameOpen} onClose={() => setWsRenameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Переименовать воркспейс</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={wsRenameVal}
            onChange={(e) => setWsRenameVal(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWsRenameOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (wsRenameVal.trim()) {
                await renameWorkspace(activeWorkspaceId, wsRenameVal.trim());
              }
              setWsRenameOpen(false);
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ——— Workspace delete dialog ——— */}
      <Dialog open={wsDeleteOpen} onClose={() => setWsDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить воркспейс?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Все подключения внутри «{wsName}» будут удалены без возможности восстановления.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWsDeleteOpen(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              await deleteWorkspace(activeWorkspaceId);
              setWsDeleteOpen(false);
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ——— Delete connection dialog ——— */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Удалить подключение?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Подключение и все его данные будут удалены без возможности восстановления.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <ConnectionLogDrawer
        open={showLog}
        onClose={() => setShowLog(false)}
        connectionId={selected?.id ?? ""}
        connectionName={selected ? getTitle(selected) : ""}
      />
    </Box>
  );
}

// ——— ParamsForm (inline edit with ⌘S) ———

function ParamsForm({ conn, onSaved }: { conn: Connection; onSaved: () => void }) {
  const { labels } = useStore();
  const [displayName, setDisplayName] = useState(conn.display_name);
  const [server, setServer] = useState(conn.server);
  const [username, setUsername] = useState(conn.username);
  const [password, setPassword] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [labelValues, setLabelValues] = useState<Record<string, string>>({ ...conn.labels });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(conn.display_name);
    setServer(conn.server);
    setUsername(conn.username);
    setPassword("");
    setSharedSecret("");
    setLabelValues({ ...conn.labels });
    setDirty(false);
  }, [conn.id, conn.display_name, conn.server, conn.username, conn.labels]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await api.connections.save({
        id: conn.id,
        display_name: displayName,
        server,
        username,
        password,
        shared_secret: sharedSecret,
        labels: labelValues,
        tunnel_mode: conn.tunnel_mode,
        split_routes: conn.split_routes,
      });
      setDirty(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [dirty, saving, conn, displayName, server, username, password, sharedSecret, labelValues, onSaved]);

  const cancel = useCallback(() => {
    setDisplayName(conn.display_name);
    setServer(conn.server);
    setUsername(conn.username);
    setPassword("");
    setSharedSecret("");
    setLabelValues({ ...conn.labels });
    setDirty(false);
  }, [conn]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape" && dirty) {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, cancel, dirty]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
      <TextField label="Название" size="small" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setDirty(true); }} />
      <TextField label="Сервер" size="small" value={server} onChange={(e) => { setServer(e.target.value); setDirty(true); }} />
      <TextField label="Логин" size="small" value={username} onChange={(e) => { setUsername(e.target.value); setDirty(true); }} />
      <TextField label="Пароль (пусто = не менять)" size="small" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setDirty(true); }} />
      <TextField label="Общий ключ (пусто = не менять)" size="small" type="password" value={sharedSecret} onChange={(e) => { setSharedSecret(e.target.value); setDirty(true); }} />

      {/* Labels */}
      {labels.length > 0 && (
        <>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>Метки</Typography>
          {labels.map((l) => (
            <TextField
              key={l.id}
              label={l.name}
              size="small"
              value={labelValues[l.id] ?? ""}
              onChange={(e) => {
                setLabelValues((prev) => ({ ...prev, [l.id]: e.target.value }));
                setDirty(true);
              }}
            />
          ))}
        </>
      )}

      {dirty && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button variant="contained" size="small" onClick={save} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить (⌘S)"}
          </Button>
          <Button size="small" onClick={cancel}>Отмена (Esc)</Button>
          <Typography sx={{ fontSize: 12, color: "warning.main", ml: 1 }}>• Несохранённые изменения</Typography>
        </Box>
      )}
    </Box>
  );
}

// ——— RoutesEditor with SubnetEditor ———

function RoutesEditor({ conn, onSaved }: { conn: Connection; onSaved: () => void }) {
  const [routes, setRoutes] = useState<string[]>(conn.split_routes ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRoutes(conn.split_routes ?? []);
    setDirty(false);
  }, [conn.id, conn.split_routes]);

  const save = useCallback(async () => {
    await api.connections.save({
      id: conn.id,
      display_name: conn.display_name,
      server: conn.server,
      username: conn.username,
      password: "",
      shared_secret: "",
      labels: conn.labels,
      tunnel_mode: conn.tunnel_mode,
      split_routes: routes,
    });
    setDirty(false);
    onSaved();
  }, [conn, routes, onSaved]);

  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
        {conn.tunnel_mode === "full"
          ? "Полный туннель — весь трафик через VPN. Маршруты не требуются."
          : "Подсети для раздельного туннелирования."}
      </Typography>
      <SubnetEditor
        routes={routes}
        onChange={(r) => {
          setRoutes(r);
          setDirty(true);
        }}
      />
      {dirty && (
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <Button variant="contained" size="small" onClick={save}>
            Сохранить (⌘S)
          </Button>
          <Button
            size="small"
            onClick={() => {
              setRoutes(conn.split_routes ?? []);
              setDirty(false);
            }}
          >
            Отмена
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ——— NewConnectionForm ———

function NewConnectionForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = displayName.trim() && server.trim() && username.trim() && password.trim() && sharedSecret.trim();

  const save = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await api.connections.save({
        display_name: displayName.trim(),
        server: server.trim(),
        username: username.trim(),
        password,
        shared_secret: sharedSecret,
        labels: {},
        tunnel_mode: "full",
        split_routes: [],
      });
      onDone();
    } catch (e) {
      console.error("save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, displayName, server, username, password, sharedSecret, onDone]);

  // ⌘S save, Esc cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, onCancel]);

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Новое подключение</Typography>
      <TextField label="Название" size="small" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
      <TextField label="Сервер" size="small" value={server} onChange={(e) => setServer(e.target.value)} />
      <TextField label="Логин" size="small" value={username} onChange={(e) => setUsername(e.target.value)} />
      <TextField label="Пароль" size="small" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextField label="Общий ключ" size="small" type="password" value={sharedSecret} onChange={(e) => setSharedSecret(e.target.value)} />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={save} disabled={!canSave || saving}>
          {saving ? "Сохранение…" : "Создать (⌘S)"}
        </Button>
        <Button onClick={onCancel}>Отмена (Esc)</Button>
      </Box>
    </Box>
  );
}
