export function parseActivityCursor(cursor: string): { createdAtMs: number; id: string } | null {
  const idx = cursor.indexOf(':');
  if (idx <= 0) return null;
  const ms = Number(cursor.slice(0, idx));
  const id = cursor.slice(idx + 1);
  if (!Number.isFinite(ms) || !id) return null;
  return { createdAtMs: ms, id };
}

export function makeActivityCursor(createdAtMs: number, id: string): string {
  return `${createdAtMs}:${id}`;
}

