// src/server.js
import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

app.use(cors());
app.use(express.json());

/* =====================================================
   SQLite Database
   ===================================================== */
const dbFile = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error("DB Connection Error:", err);
  else console.log("Database connected:", dbFile);
});

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      ip TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Seed default user
const seedUser = async () => {
  const passwordHash = await bcrypt.hash("123456", 10);
  db.run(
    `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
    ["test@example.com", passwordHash],
    (err) => {
      if (err) console.error("Seeder Error:", err);
      else console.log("Default user seeded: test@example.com / 123456");
    }
  );
};
seedUser();

/* =====================================================
   JWT Middleware
   ===================================================== */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

/* =====================================================
   LOGIN API
   ===================================================== */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Login DB Error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  });
});

/* =====================================================
   IP HISTORY APIs
   ===================================================== */

/* Get history */
app.get("/api/history", authenticateToken, (req, res) => {
  db.all(
    "SELECT * FROM ip_history WHERE user_id = ? ORDER BY timestamp DESC",
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("Get history error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(rows);
    }
  );
});

/* Save history */
app.post("/api/history", authenticateToken, (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ message: "IP is required" });

  db.run(
    "INSERT INTO ip_history (user_id, ip) VALUES (?, ?)",
    [req.user.id, ip],
    function (err) {
      if (err) {
        console.error("Insert history error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ id: this.lastID, ip });
    }
  );
});

/* Delete history */
app.delete("/api/history/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    "DELETE FROM ip_history WHERE id = ? AND user_id = ?",
    [id, req.user.id],
    function (err) {
      if (err) {
        console.error("Delete history error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (this.changes === 0) return res.status(404).json({ message: "History not found" });
      res.json({ message: "Deleted successfully" });
    }
  );
});

/* Health check */
app.get("/", (_, res) => {
  res.send("IP Geo API with SQLite is running 🚀");
});

/* =====================================================
   LOCAL SERVER (DEV ONLY)
   ===================================================== */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;