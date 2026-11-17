import i18n from "./i18n";
import type { Connection_Serialize as Connection } from "../typing/bindings";

export function getTitle(conn: Connection): string {
  const company = conn.labels["company"] ?? "";
  const branch = conn.labels["branch"] ?? "";
  if (company && branch) return `${company} · ${branch}`;
  return company || branch || conn.display_name || conn.server;
}

/** Fuzzy-подсветка: возвращает [{text, match}] части */
export function highlightMatch(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  if (!query.trim()) return [{ text, match: false }];
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = t.indexOf(q, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  return parts;
}

export function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const now = Date.now();
  const diff = now - ts * 1000;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return i18n.t("time.justNow");
  if (min < 60) return i18n.t("time.minutesAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return i18n.t("time.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return i18n.t("time.daysAgo", { n: d });
  const w = Math.floor(d / 7);
  if (w < 5) return i18n.t("time.weeksAgo", { n: w });
  const mo = Math.floor(d / 30);
  if (mo < 12) return i18n.t("time.monthsAgo", { n: mo });
  return i18n.t("time.yearsAgo", { n: Math.floor(d / 365) });
}

export function absoluteTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(i18n.resolvedLanguage, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Форматирование объёма трафика: 512 B, 1.2 KB, 34.5 MB, 1.1 GB */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** Форматирование длительности: 5:03, 1:05:03, 2д 1:05:03 */
export function formatDuration(secs: number): string {
  const total = Math.max(0, Math.floor(secs));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const time =
    d > 0 || h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  return d > 0 ? i18n.t("time.durationDays", { n: d, time }) : time;
}

/** Проверяет совпадение поиска по company + branch + ip + service_name */
export function matchesQuery(conn: Connection, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const company = conn.labels["company"] ?? "";
  const branch = conn.labels["branch"] ?? "";
  return (
    company.toLowerCase().includes(q) ||
    branch.toLowerCase().includes(q) ||
    conn.server.toLowerCase().includes(q) ||
    conn.display_name.toLowerCase().includes(q) ||
    conn.service_name.toLowerCase().includes(q)
  );
}

/** Строит строку для подсветки: «Компания · Филиал» */
export function getDisplayParts(conn: Connection, query: string) {
  const title = getTitle(conn);
  return highlightMatch(title, query);
}
