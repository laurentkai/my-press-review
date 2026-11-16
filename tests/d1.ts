import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function memoryD1() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(resolve("migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(resolve("migrations", file), "utf8"));
  function prepare(sql: string, values: SQLInputValue[] = []) {
    return {
      bind: (...next: SQLInputValue[]) => prepare(sql, next),
      first: async () => sqlite.prepare(sql).get(...values) ?? null,
      all: async () => ({
        success: true,
        results: sqlite.prepare(sql).all(...values),
        meta: {},
      }),
      run: async () => ({
        success: true,
        meta: sqlite.prepare(sql).run(...values),
        results: [],
      }),
    };
  }
  const db = {
    prepare,
    batch: async (statements: ReturnType<typeof prepare>[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite, close: () => sqlite.close() };
}
