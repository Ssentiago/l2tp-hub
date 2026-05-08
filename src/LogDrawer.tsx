import {useEffect, useRef, useState} from "react";
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Tooltip,
    Divider,
    Chip,
} from "@mui/material";
import {Close, DeleteSweep, Circle} from "@mui/icons-material";
import {listen} from "@tauri-apps/api/event";
import {useVirtualizer} from "@tanstack/react-virtual";

interface LogEntry {
    message: string;
    timestamp: number;
}

const MAX_AGE_MS = 45 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 1000;
const MAX_ENTRIES = 2000;
const ROW_HEIGHT = 22;

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function levelColor(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("error") || m.includes("err:") || m.includes("failed")) return "#f28b82";
    if (m.includes("warn") || m.includes("timeout")) return "#fdd663";
    if (m.includes("connect") || m.includes("ok") || m.includes("success")) return "#81c995";
    return "#8ab4f8";
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export function LogDrawer({open, onClose}: Props) {
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    pausedRef.current = paused;

    const scrollRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    const virtualizer = useVirtualizer({
        count: entries.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 20,
    });

    useEffect(() => {
        let unlisten: (() => void) | null = null;
        listen<LogEntry>("app:log", (event) => {
            if (pausedRef.current) return;
            setEntries((prev) => {
                const next = [...prev, event.payload];
                return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
            });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            const cutoff = Date.now() - MAX_AGE_MS;
            setEntries((prev) => prev.filter((e) => e.timestamp >= cutoff));
        }, PRUNE_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (paused || !open || userScrolledUp.current || entries.length === 0) return;
        virtualizer.scrollToIndex(entries.length - 1, {behavior: "auto"});
    }, [entries.length, paused, open]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < ROW_HEIGHT * 2;
        userScrolledUp.current = !atBottom;
    };

    const clear = () => setEntries([]);

    const resumeAndScrollDown = () => {
        setPaused(false);
        userScrolledUp.current = false;
        if (entries.length > 0) {
            virtualizer.scrollToIndex(entries.length - 1, {behavior: "auto"});
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 520,
                        bgcolor: "#0d1117",
                        borderLeft: "1px solid #30363d",
                        display: "flex",
                        flexDirection: "column",
                    },
                },
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderBottom: "1px solid #30363d",
                    flexShrink: 0,
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: "#8ab4f8",
                        letterSpacing: 1,
                        flex: 1
                    }}
                >
                    DEBUG LOG
                </Typography>

                <Chip
                    size="small"
                    label={`${entries.length} событий`}
                    sx={{fontSize: 11, height: 20, bgcolor: "#21262d", color: "#8b949e"}}
                />

                <Tooltip title={paused ? "Возобновить" : "Пауза"}>
                    <IconButton
                        size="small"
                        onClick={paused ? resumeAndScrollDown : () => setPaused(true)}
                        sx={{color: paused ? "#fdd663" : "#8b949e"}}
                    >
                        <Circle fontSize="small" sx={{fontSize: 10}}/>
                    </IconButton>
                </Tooltip>

                <Tooltip title="Очистить">
                    <IconButton size="small" onClick={clear} sx={{color: "#8b949e"}}>
                        <DeleteSweep fontSize="small"/>
                    </IconButton>
                </Tooltip>

                <Tooltip title="Закрыть">
                    <IconButton size="small" onClick={onClose} sx={{color: "#8b949e"}}>
                        <Close fontSize="small"/>
                    </IconButton>
                </Tooltip>
            </Box>

            <Box
                ref={scrollRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": {width: 6},
                    "&::-webkit-scrollbar-track": {bgcolor: "transparent"},
                    "&::-webkit-scrollbar-thumb": {bgcolor: "#30363d", borderRadius: 3},
                }}
            >
                {entries.length === 0 ? (
                    <Typography
                        sx={{
                            color: "#484f58",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            mt: 4,
                            textAlign: "center"
                        }}
                    >
                        Событий нет
                    </Typography>
                ) : (
                    <Box sx={{height: virtualizer.getTotalSize(), width: "100%", position: "relative"}}>
                        {virtualizer.getVirtualItems().map((vItem) => {
                            const e = entries[vItem.index];
                            return (
                                <Box
                                    key={vItem.key}
                                    data-index={vItem.index}
                                    sx={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${vItem.start}px)`,
                                        height: ROW_HEIGHT,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        px: 1.5,
                                        "&:hover": {bgcolor: "#161b22"},
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography
                                        component="span"
                                        sx={{
                                            color: "#484f58",
                                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                            fontSize: 11,
                                            flexShrink: 0,
                                            userSelect: "text",
                                        }}
                                    >
                                        {formatTime(e.timestamp)}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            color: levelColor(e.message),
                                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                            fontSize: 12,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            userSelect: "text",
                                            cursor: "text",
                                            flex: 1,
                                        }}
                                    >
                                        {e.message}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            <Divider sx={{borderColor: "#30363d"}}/>
            <Box sx={{px: 2, py: 1, flexShrink: 0}}>
                <Typography sx={{color: "#484f58", fontSize: 10, fontFamily: "'JetBrains Mono', monospace"}}>
                    Хранение: 45 мин · макс {MAX_ENTRIES} записей{paused && " · ⏸ пауза"}
                </Typography>
            </Box>
        </Drawer>
    );
}