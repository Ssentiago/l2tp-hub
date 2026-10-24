import type { Connection, ConnectionWithStatus } from "../typing/definitions";

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
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн назад`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} нед назад`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} мес назад`;
  return `${Math.floor(d / 365)} г назад`;
}

export function absoluteTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Проверяет совпадение поиска по company + branch + ip + name */
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
    conn.name.toLowerCase().includes(q)
  );
}

/** Строит строку для подсветки: «Компания · Филиал» */
export function getDisplayParts(conn: Connection, query: string) {
  const title = getTitle(conn);
  return highlightMatch(title, query);
}
