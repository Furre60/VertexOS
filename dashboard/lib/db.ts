import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * VertexOS's lead-scoring data (scored.json) stays read-only and file-based —
 * this module only owns the lightweight CRM layer added in Sprint 3
 * (favorite / status / notes / last contacted), stored in SQLite so it can
 * be updated from the dashboard without touching the scoring pipeline.
 *
 * The database file lives at ../data/crm.db, alongside the existing
 * data/*.json files, so all pipeline + dashboard state stays in one place.
 */

const DB_PATH = path.join(process.cwd(), "..", "data", "crm.db");

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createConnection(): Database.Database {
  ensureDataDir();
  const connection = new Database(DB_PATH);
  connection.pragma("journal_mode = WAL");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      slug TEXT PRIMARY KEY,
      favorite INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'New',
      notes TEXT NOT NULL DEFAULT '',
      last_contacted TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return connection;
}

// Next.js dev mode hot-reloads modules on every change, which would open a
// new SQLite connection each time. Cache the connection on `globalThis` so
// it survives module reloads (mirrors the common Prisma-in-dev pattern).
declare global {
  // eslint-disable-next-line no-var
  var __vertexCrmDb: Database.Database | undefined;
}

export const db: Database.Database = globalThis.__vertexCrmDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.__vertexCrmDb = db;
}
