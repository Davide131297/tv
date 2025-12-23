import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Database can only be used on the server side');
}

let db: Database.Database;

try {
  // First, try the regular database path (for local development)
  const dbPath = path.resolve(process.cwd(), "database/database.sqlite");
  
  if (fs.existsSync(dbPath)) {
    console.log("Using local database:", dbPath);
    db = new Database(dbPath);
  } else {
    // In production/Vercel, try to find the database in public folder
    const publicDbPath = path.resolve(process.cwd(), "public/database.sqlite");
    
    if (fs.existsSync(publicDbPath)) {
      console.log("Using public database:", publicDbPath);
      // Copy database to temporary location for better-sqlite3 (Vercel provides /tmp)
      const tmpPath = "/tmp/database.sqlite";
      if (!fs.existsSync(tmpPath)) {
        fs.copyFileSync(publicDbPath, tmpPath);
      }
      db = new Database(tmpPath, { readonly: true });
    } else {
      console.error("No database file found. Checked paths:", [dbPath, publicDbPath]);
      // Create in-memory database as fallback
      db = new Database(":memory:");
      console.warn("Using in-memory database. Data will be empty.");
    }
  }
} catch (error) {
  console.error("Database initialization error:", error);
  // Create in-memory database as ultimate fallback
  db = new Database(":memory:");
  console.warn("Fallback to in-memory database due to error.");
}

export default db;
