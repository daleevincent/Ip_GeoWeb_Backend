// src/server.js
import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to SQLite
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) console.error("DB Connection Error:", err);
  else console.log("Database connected");
});

app.use(cors());
app.use(express.json());

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, "secretkey", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Initialize Tables
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

// Seed Default User
const seedUser = async () => {
  const passwordHash = await bcrypt.hash("123456", 10);

  db.run(
    `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
    ["test@example.com", passwordHash],
    (err) => {
      if (err) console.log("Seeder Error:", err);
      else console.log("Default user seeded: test@example.com / 123456");
    }
  );
};

seedUser();

// =======================
// 🔐 AUTH ROUTES
// =======================

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!user) return res.status(400).json({ message: "Invalid email or password" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: "Invalid email or password" });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        "secretkey",
        { expiresIn: "1h" }
      );

      res.json({ token });
    }
  );
});

// =======================
// 📜 HISTORY ROUTES (Moved Up)
// =======================

app.get("/api/history", authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT * FROM ip_history WHERE user_id = ? ORDER BY timestamp DESC",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(rows);
    }
  );
});

app.post("/api/history", authenticateToken, (req, res) => {
  const { ip } = req.body;
  const userId = req.user.id;

  db.run(
    "INSERT INTO ip_history (user_id, ip) VALUES (?, ?)",
    [userId, ip],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ id: this.lastID, ip });
    }
  );
});

app.delete("/api/history/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run(
    "DELETE FROM ip_history WHERE id = ? AND user_id = ?",
    [id, userId],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      if (this.changes === 0) return res.status(404).json({ message: "History not found" });

      res.json({ message: "Deleted successfully" });
    }
  );
});

// =======================
// 🌐 IP GEOLOCATION ROUTES
// =======================

// Get current IP info
app.get("/api", async (req, res) => {
  try {
    const response = await axios.get("https://ipinfo.io/json");
    res.json(response.data);
  } catch (err) {
    console.error("IP Fetch Error:", err.message);
    res.status(500).json({ message: "Failed to fetch IP info" });
  }
});

// ✅ FIXED: Changed route from /api/:ip to /api/lookup/:ip
app.get("/api/lookup/:ip", async (req, res) => {
  const { ip } = req.params;

  try {
    const response = await axios.get(`https://ipinfo.io/${ip}/json`);
    res.json(response.data);
  } catch (err) {
    console.error("IP Fetch Error:", err.message);
    res.status(500).json({ message: "Failed to fetch IP info" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});