import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../../database/database.sqlite");
const db = new Database(dbPath);

export default db;
