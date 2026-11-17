import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box, Drawer, Tab, Tabs, Typography, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, IconButton, Tooltip, Chip,
} from "@mui/material";
import { Close, ContentCopy, Refresh } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { api } from "../../../core/api";
import { formatBytes, formatDuration } from "../../../core/display";
import toast from "react-hot-toast";
import i18n from "../../../core/i18n";
import type {
  SessionMeta_Serialize as SessionMeta,
  SessionLogs_Serialize as SessionLogs,
} from "../../../typing/bindings";

interface Props {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString(i18n.resolvedLanguage, {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function filterLogLines(raw: string): string {
  return raw.split("\n").filter((l) => l.startsWith("[")).join("\n");
}

export function ConnectionLogDrawer({ open, onClose, connectionId, connectionName }: Props) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<SessionMeta[]>([]);
  const [selectedTs, setSelectedTs] = useState<number | null>(null);
  const [logs, setLogs] = useState<SessionLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.logs.getHistory(connectionId)
      .then((h) => {
        setHistory(h);
        if (h.length > 0) {
          setSelectedTs(h[0].timestamp);
        } else {
          setSelectedTs(null);
          setLogs(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, connectionId]);

  useEffect(() => {
    if (selectedTs === null) { setLogs(null); return; }
    setLoading(true);
    api.logs.getSession(connectionId, selectedTs)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connectionId, selectedTs]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [tab, logs]);

  const rawLog = logs?.app ?? "";
  const filteredLog = useMemo(() => filterLogLines(rawLog), [rawLog]);

  const tabContent = tab === 0 ? filteredLog : rawLog;
  const tabLabel = tab === 0 ? t("logDrawer.tabLogs") : t("logDrawer.tabRaw");
  const lineCount = tabContent ? tabContent.split("\n").filter((l: string) => l.trim()).length : 0;

  const copyLog = () => {
    if (!tabContent) return;
    const header = `[${tabLabel}] ${connectionName}`;
    navigator.clipboard.writeText(`${header}\n${"—".repeat(header.length)}\n${tabContent}`).then(() => {
      toast.success(t("logDrawer.copied", { count: lineCount }));
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 600, md: 800 } } } }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {t("logDrawer.title", { name: connectionName })}
          </Typography>
          <Tooltip title={t("logDrawer.refresh")}>
            <IconButton
              size="small"
              onClick={() => {
                if (selectedTs !== null) {
                  setLoading(true);
                  api.logs.getSession(connectionId, selectedTs)
                    .then(setLogs)
                    .finally(() => setLoading(false));
                }
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("logDrawer.copy")}>
            <span>
              <IconButton size="small" onClick={copyLog} disabled={!tabContent}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Session selector */}
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{t("logDrawer.session")}</InputLabel>
            <Select
              label={t("logDrawer.session")}
              value={selectedTs ?? ""}
              onChange={(e) => setSelectedTs(Number(e.target.value))}
              disabled={history.length === 0}
            >
              {history.map((s) => (
                <MenuItem key={s.timestamp} value={s.timestamp}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                    <Typography variant="body2">
                      {formatTimestamp(s.timestamp)}
                    </Typography>
                    <Chip
                      label={s.status === "error" ? t("logDrawer.statusError") : t("logDrawer.statusDisconnected")}
                      size="small"
                      color={s.status === "error" ? "error" : "default"}
                      sx={{ height: 18, fontSize: 10 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {s.started_at && s.ended_at ? formatDuration(s.ended_at - s.started_at) : ""}
                      {s.bytes_in !== null
                        ? ` · ↓${formatBytes(s.bytes_in)} ↑${formatBytes(s.bytes_out ?? 0)}`
                        : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "right" }}>
                      {s.server}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {logs?.meta.error && (
            <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: "block" }}>
              {logs.meta.error}
            </Typography>
          )}
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 36, borderBottom: 1, borderColor: "divider", px: 1 }}
        >
          <Tab label={`${t("logDrawer.tabLogs")}${lineCount && tab === 0 ? ` (${lineCount})` : ""}`} sx={{ minHeight: 36, py: 0, fontSize: 12, textTransform: "none" }} />
          <Tab label={`${t("logDrawer.tabRaw")}${lineCount && tab === 1 ? ` (${lineCount})` : ""}`} sx={{ minHeight: 36, py: 0, fontSize: 12, textTransform: "none" }} />
        </Tabs>

        {/* Log content */}
        <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {loading && (
            <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
              <CircularProgress size={18} />
            </Box>
          )}
          <Box
            ref={logRef}
            sx={{
              height: "100%", overflow: "auto", p: 1.5,
              bgcolor: "grey.900", fontFamily: "monospace",
              fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          >
            {tabContent || (
              <Typography variant="caption" color="text.disabled">
                {history.length === 0 ? t("logDrawer.noSessions") : t("logDrawer.emptyLog")}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
