import "server-only"
import Database from "better-sqlite3"
import path from "path"

// The SQLite file is copied into frontend/db/ by scripts/copy-db.js
// (run automatically via prebuild / predev). This avoids Turbopack
// restrictions on paths outside the project root.
const DB_PATH = path.join(process.cwd(), "db", "gender_gap.db")

let _db: Database.Database | null = null

export function db(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
  }
  return _db
}
