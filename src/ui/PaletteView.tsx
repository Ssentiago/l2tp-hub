import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ChevronRight, ExpandMore } from "@mui/icons-material";
import { useStore } from "../store";
import { api } from "../core/api";
import { matchesQuery } from "../core/display";
import type { ConnectionWithStatus } from "../typing/definitions";
import { SearchInput } from "./SearchInput";
import { ActiveConnectionBar } from "./ActiveConnectionBar";
import { ConnectionRow } from "./ConnectionRow";
import { KeyHints } from "./KeyHints";

function groupByCompanyFn(conns: ConnectionWithStatus[]): Map<string, ConnectionWithStatus[]> {
  const m = new Map<string, ConnectionWithStatus[]>();
  for (const c of conns) {
    const key = c.labels["company"] ?? "";
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(c);
  }
  return m;
}

export function PaletteView() {
  const {
    connections,
    query,
    setQuery,
    groupByCompany,
    toggleGroupByCompany,
    selectedKey,
    setSelectedKey,
    connectVpn,
    disconnectVpn,
    loadConnections,
    setViewMode,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    sudoReady,
  } = useStore();

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => connections.filter((c) => matchesQuery(c, query)),
    [connections, query],
  );

  // Сортировка: по имени (по умолчанию) или по дате подключения
  const [sortBy, setSortBy] = useState<"name" | "recent">("recent");
  const all = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "recent") {
      arr.sort((a, b) => (b.last_connected_at ?? 0) - (a.last_connected_at ?? 0));
    } else {
      arr.sort((a, b) => a.display_name.localeCompare(b.display_name));
    }
    return arr;
  }, [filtered, sortBy]);

  const makeKey = (id: string) => `all:${id}`;
  const parseId = (key: string) => key.split(":").slice(1).join(":");

  // Ensure selection exists
  useEffect(() => {
    if (filtered.length === 0) return;
    const allKeys = new Set(all.map((c) => makeKey(c.id)));
    if (selectedKey && allKeys.has(selectedKey)) return;
    if (all.length > 0) setSelectedKey(makeKey(all[0].id));
  }, [all, selectedKey, setSelectedKey]);

  const handleSelect = useCallback((key: string) => setSelectedKey(key), [setSelectedKey]);

  const selectedConnId = selectedKey ? parseId(selectedKey) : null;

  const handleConnect = useCallback(
    async (id: string) => {
      if (!sudoReady) return;
      await connectVpn(id);
    },
    [sudoReady, connectVpn],
  );

  const handleDisconnect = useCallback(async (id: string) => disconnectVpn(id), [disconnectVpn]);

  const handleModeToggle = useCallback(
    async (id: string) => {
      const c = connections.find((c) => c.id === id);
      if (!c || c.status === "connected") return;
      const newMode = c.tunnel_mode === "split" ? "full" : "split";
      await api.connections.save({
        id: c.id,
        display_name: c.display_name,
        server: c.server,
        username: c.username,
        password: "",
        shared_secret: "",
        labels: c.labels,
        tunnel_mode: newMode,
        split_routes: c.split_routes,
      });
      await loadConnections();
    },
    [connections, loadConnections],
  );

  // keyboard navigation — навигация только в пределах текущей секции
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const flatKeys = all.map((c) => makeKey(c.id));
      const idx = flatKeys.indexOf(selectedKey ?? "");
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (idx < flatKeys.length - 1) setSelectedKey(flatKeys[idx + 1]);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (idx > 0) setSelectedKey(flatKeys[idx - 1]);
          break;
        case "Enter":
          e.preventDefault();
          if (selectedConnId) {
            const c = connections.find((c) => c.id === selectedConnId);
            if (c?.status === "connected") handleDisconnect(c.id);
            else handleConnect(selectedConnId);
          }
          break;
        case "Tab":
          e.preventDefault();
          if (selectedConnId) handleModeToggle(selectedConnId);
          break;
      }
    },
    [all, selectedKey, selectedConnId, connections, handleConnect, handleDisconnect, handleModeToggle, setSelectedKey],
  );

  const activeConn = connections.find((c) => c.status === "connected" || c.status === "connecting" || c.status === "reconnecting") ?? null;

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const renderRow = (c: ConnectionWithStatus, title?: string) => {
    const rowKey = makeKey(c.id);
    return (
      <ConnectionRow
        key={rowKey}
        conn={c}
        query={query}
        selected={rowKey === selectedKey}
        title={title}
        onSelect={() => handleSelect(rowKey)}
        onModeToggle={() => handleModeToggle(c.id)}
        onConnect={() => handleConnect(c.id)}
        onDisconnect={() => handleDisconnect(c.id)}
      />
    );
  };

  const renderRows = (conns: ConnectionWithStatus[], sectionLabel: string) => {
    if (conns.length === 0) return null;

    const rows = groupByCompany
      ? (() => {
          const groups = groupByCompanyFn(conns);
          const singles: ConnectionWithStatus[] = [];
          const multiples: [string, ConnectionWithStatus[]][] = [];
          for (const [company, groupConns] of groups) {
            if (groupConns.length === 1) {
              singles.push(groupConns[0]);
            } else {
              multiples.push([company, groupConns]);
            }
          }
          multiples.sort(([a], [b]) => {
            if (!a && b) return 1;
            if (a && !b) return -1;
            return a.localeCompare(b);
          });

          return [
            ...singles.map((c) => renderRow(c)),
            ...(singles.length > 0 && multiples.length > 0 ? [<Box key="gap" sx={{ height: 8 }} />] : []),
            ...multiples.map(([company, groupConns]) => {
              const gKey = `grp:${company || "none"}`;
              const isCollapsed = collapsed.has(gKey);
              const branchOf = (c: ConnectionWithStatus) => c.labels["branch"] || c.display_name || c.server;
              return (
                <Box key={gKey}>
                  <Box
                    onClick={() => toggleCollapsed(gKey)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      pl: 2,
                      pr: 2,
                      pt: 1,
                      pb: 0.25,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight sx={{ fontSize: 16, color: "text.secondary" }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 16, color: "text.secondary" }} />
                    )}
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.secondary" }}>
                      {company || "Без группы"}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 400, color: "text.disabled" }}>
                      · {groupConns.length}
                    </Typography>
                  </Box>
                  {!isCollapsed && (
                    <Box sx={{ ml: 2, borderLeft: "1px solid", borderColor: "divider" }}>
                      {groupConns.map((c) => renderRow(c, branchOf(c)))}
                    </Box>
                  )}
                </Box>
              );
            }),
          ];
        })()
      : conns.map((c) => renderRow(c));

    return (
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            pt: 2,
            pb: 0.5,
            mt: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
            bgcolor: "background.default",
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              flex: 1,
            }}
          >
            {sectionLabel}
          </Typography>
          {/* Переключатель сортировки */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {(["name", "recent"] as const).map((s) => (
              <Box
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  setSortBy(s);
                }}
                sx={{
                  fontSize: 10,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "4px",
                  cursor: "pointer",
                  bgcolor: sortBy === s ? "rgba(255,255,255,0.08)" : "transparent",
                  color: sortBy === s ? "text.primary" : "text.disabled",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                }}
              >
                {s === "name" ? "А–Я" : "Недавние"}
              </Box>
            ))}
          </Box>
        </Box>
        {rows}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }} onKeyDown={handleKeyDown}>
      {/* header */}
      <Box sx={{ display: "flex", alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}>
        <WorkspaceSelect />
        <Box sx={{ flex: 1, position: "relative" }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            groupByCompany={groupByCompany}
            onToggleGroup={toggleGroupByCompany}
            inputRef={searchRef}
          />
        </Box>
      </Box>

      {/* active connection bar */}
      {activeConn && (
        <ActiveConnectionBar conn={activeConn} onDisconnect={() => handleDisconnect(activeConn.id)} />
      )}

      {/* list */}
      <Box ref={listRef} sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
        {renderRows(all, "Все")}
        {filtered.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Typography sx={{ color: "text.disabled" }}>Ничего не найдено</Typography>
          </Box>
        )}
      </Box>

      <KeyHints />
    </Box>
  );
}

function WorkspaceSelect() {
  const { workspaces, activeWorkspaceId, switchWorkspace } = useStore();
  return (
    <Box
      component="select"
      value={activeWorkspaceId}
      onChange={(e) => switchWorkspace(e.target.value)}
      sx={{
        appearance: "none",
        bgcolor: "transparent",
        border: "none",
        borderRight: "1px solid",
        borderColor: "divider",
        color: "text.primary",
        fontSize: 13,
        fontWeight: 500,
        px: 2,
        height: 48,
        cursor: "pointer",
        outline: "none",
        minWidth: 120,
        "& option": { bgcolor: "#1e1e1e", color: "#fff" },
      }}
    >
      {workspaces.map((ws) => (
        <option key={ws.id} value={ws.id}>
          {ws.name}
        </option>
      ))}
    </Box>
  );
}