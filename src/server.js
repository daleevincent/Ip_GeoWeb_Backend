import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

app.use(cors());
app.use(express.json());

/* =====================================================
   IN-MEMORY DEMO USER (SERVERLESS SAFE)
   ===================================================== */
const demoUser = {
  id: 1,
  email: "test@example.com",
  // password: 123456
  passwordHash: await bcrypt.hash("123456", 10),
};

/* =====================================================
   JWT MIDDLEWARE
   ===================================================== */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

/* =====================================================
   LOGIN API
   ===================================================== */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (email !== demoUser.email) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, demoUser.passwordHash);
  if (!match) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { id: demoUser.id, email: demoUser.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

/* =====================================================
   DEMO HISTORY (IN-MEMORY)
   ===================================================== */
let ipHistory = [];

/* Get history */
app.get("/api/history", authenticateToken, (req, res) => {
  res.json(ipHistory);
});

/* Save history */
app.post("/api/history", authenticateToken, (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    return res.status(400).json({ message: "IP is required" });
  }

  const entry = {
    id: Date.now(),
    ip,
    created_at: new Date().toISOString(),
  };

  // prevent duplicates
  ipHistory = ipHistory.filter(item => item.ip !== ip);
  ipHistory.unshift(entry);

  res.json(entry);
});

/* Delete history item */
app.delete("/api/history/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  ipHistory = ipHistory.filter(item => item.id !== id);
  res.json({ message: "Deleted" });
});

/* =====================================================
   HEALTH CHECK
   ===================================================== */
app.get("/", (_, res) => {
  res.send("IP Geo API is running 🚀");
});

/* =====================================================
   START SERVER (LOCAL ONLY)
   ===================================================== */
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;