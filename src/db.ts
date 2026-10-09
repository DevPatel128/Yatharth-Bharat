// The only file allowed to touch env.DB. Every query is scoped to one user ("app-level RLS").
// Add a table: a new file in migrations/ with `user_id TEXT NOT NULL`, then list it in USER_TABLES and WRITABLE.
// Editing this file is allowed; merging a change to it always needs a human (it guards every user's data).
// Yatharth Bharat stores no user data in Stages 0-3 (no accounts; DECISIONS.md D-004), so there are no user tables yet.
// Public verified data ships as versioned JSON in data/records and is read at build time, not through D1.
type DB = {
  prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: unknown[] }>; first(): Promise<unknown>; run(): Promise<unknown> } };
  batch(stmts: unknown[]): Promise<unknown>;
};

// shortcut: typed as string[] while empty; switch back to `as const` when the first user table is added.
export const USER_TABLES: readonly string[] = [];
export type Table = string;
// Columns a client may write. Never user_id, role, plan.
export const WRITABLE: Record<Table, readonly string[]> = {};

const pick = (t: Table, data: Record<string, unknown>) => {
  const keys = Object.keys(data);
  const bad = keys.filter((k) => !WRITABLE[t].includes(k));
  if (bad.length || !keys.length) throw new Error(`db: not writable ${t}.${bad.join(',') || '(none)'}`);
  return keys;
};

// userId must come from the verified session, never from the request.
export function forUser(db: DB, userId: string) {
  if (!userId) throw new Error('db: missing userId');
  const q = (sql: string, ...v: unknown[]) => db.prepare(sql).bind(userId, ...v);
  return {
    list: (t: Table, limit = 50) => q(`SELECT * FROM ${t} WHERE user_id = ? ORDER BY rowid DESC LIMIT ?`, Math.min(limit, 100)).all(),
    get: (t: Table, id: string) => q(`SELECT * FROM ${t} WHERE user_id = ? AND id = ?`, id).first(),
    insert: async (t: Table, id: string, data: Record<string, unknown>) => {
      const k = pick(t, data);
      return q(`INSERT INTO ${t} (user_id, id, ${k}) VALUES (?, ?, ${k.map(() => '?')})`, id, ...k.map((c) => data[c])).run();
    },
    update: async (t: Table, id: string, data: Record<string, unknown>) => {
      const k = pick(t, data);
      return db.prepare(`UPDATE ${t} SET ${k.map((c) => `${c} = ?`)} WHERE user_id = ? AND id = ?`).bind(...k.map((c) => data[c]), userId, id).run();
    },
    remove: (t: Table, id: string) => q(`DELETE FROM ${t} WHERE user_id = ? AND id = ?`, id).run(),
    // One transaction: all or nothing.
    deleteAccount: () => db.batch(USER_TABLES.map((t) => q(`DELETE FROM ${t} WHERE user_id = ?`))),
    exportAll: async () => Object.fromEntries(await Promise.all(USER_TABLES.map(async (t) => [t, (await q(`SELECT * FROM ${t} WHERE user_id = ?`).all()).results]))),
  };
}
