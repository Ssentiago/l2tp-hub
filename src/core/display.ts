import type { Connection } from "../typing/definitions";

export function getDisplayTitle(conn: Connection): string {
  if (conn.display_name) return conn.display_name;
  if (conn.labels["branch"]) return conn.labels["branch"];
  if (conn.labels["company"]) return conn.labels["company"];
  return conn.server;
}
