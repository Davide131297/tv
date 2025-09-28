import Database from "better-sqlite3";
import path from "path";

// Ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Database can only be used on the server side');
}

const dbPath = path.resolve(process.cwd(), "database/database.sqlite");
const db = new Database(dbPath);

export default db;
