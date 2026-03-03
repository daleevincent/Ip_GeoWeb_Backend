// src/server.js
import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to SQLite (serverless-safe)
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) console.error("DB Connection Error:", err);
  else console.log("Database connected");
});

app.use(cors());
app.use(express.json());

// ---------------- JWT Middleware ----------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ---------------- Initialize Tables ----------------
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

// ---------------- Auto Seeder (IMPORTANT) ----------------
const seedUser = async () => {
  const passwordHash = await bcrypt.hash("123456", 10);
  db.run(
    `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
    ["test@example.com", passwordHash],
    (err) => {
      if (err) console.log("Seeder Error:", err);
      else console.log("Default user ready: test@example.com / 123456");
    }
  );
};
seedUser();

// ---------------- Login API ----------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  });
});

// ---------------- Get User History ----------------
app.get("/api/history", authenticateToken, (req, res) => {
  db.all(
    "SELECT * FROM ip_history WHERE user_id = ? ORDER BY timestamp DESC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(rows);
    }
  );
});

// ---------------- Save IP ----------------
app.post("/api/history", authenticateToken, (req, res) => {
  db.run(
    "INSERT INTO ip_history (user_id, ip) VALUES (?, ?)",
    [req.user.id, req.body.ip],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ id: this.lastID, ip: req.body.ip });
    }
  );
});

// ---------------- Delete IP ----------------
app.delete("/api/history/:id", authenticateToken, (req, res) => {
  db.run(
    "DELETE FROM ip_history WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!this.changes) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    }
  );
});

export default app;