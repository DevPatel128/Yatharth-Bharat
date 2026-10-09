// Proves user B can never read or change user A's rows, for every user table.
// Zero dependencies: node:sqlite stands in for D1. Run: node --test test/isolation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { forUser, USER_TABLES, WRITABLE } from '../src/db.ts';

// Schema = every migration, in order: the same files `wrangler d1 migrations apply` runs.
const dir = new URL('../migrations/', import.meta.url);
const schema = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');

function fakeD1() {
  const s = new DatabaseSync(':memory:');
  s.exec(schema);
  const stmt = (sql: string, v: SQLInputValue[] = []) => ({
    all: async () => ({ results: s.prepare(sql).all(...v) }),
    first: async () => s.prepare(sql).get(...v) ?? null,
    run: async () => s.prepare(sql).run(...v),
  });
  return {
    raw: s,
    prepare: (sql: string) => ({ bind: (...v: SQLInputValue[]) => stmt(sql, v) }),
    batch: async (xs: { run(): Promise<unknown> }[]) => {
      s.exec('BEGIN');
      try { for (const x of xs) await x.run(); s.exec('COMMIT'); } catch (e) { s.exec('ROLLBACK'); throw e; }
    },
  };
}

test('every table with user_id is covered by USER_TABLES', () => {
  const d = fakeD1();
  const names = (sql: string) => d.raw.prepare(sql).all().map((r) => String(r.name));
  const tables = names("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%'")
    .filter((t) => names(`PRAGMA table_info(${t})`).includes('user_id'));
  assert.deepEqual(tables.sort(), [...USER_TABLES].sort());
});

for (const t of USER_TABLES) {
  test(`${t}: user B cannot see or change user A's rows`, async () => {
    const d = fakeD1();
    const a = forUser(d, 'A'), b = forUser(d, 'B');
    const row = Object.fromEntries(WRITABLE[t].map((c) => [c, 'x']));
    await a.insert(t, 'r1', row);
    assert.equal((await b.list(t)).results.length, 0);
    assert.equal(await b.get(t, 'r1'), null);
    await b.update(t, 'r1', row);
    await b.remove(t, 'r1');
    await b.deleteAccount();
    assert.ok(await a.get(t, 'r1'));
    assert.deepEqual((await b.exportAll())[t], []);
  });
}

test('protected columns are not writable', async () => {
  const a = forUser(fakeD1(), 'A');
  for (const t of USER_TABLES) await assert.rejects(() => a.insert(t, 'r2', { user_id: 'B' }));
});
