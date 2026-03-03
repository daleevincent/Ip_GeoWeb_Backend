// src/server.js
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();

// ── CORS ──
// Allow both local dev and deployed frontend
const allowedOrigins = [
  process.env.FRONTEND_URL, // deployed frontend
  "http://localhost:5173"   // local dev
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ── SUPABASE CLIENT ──
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── JWT AUTH MIDDLEWARE ──
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// ── LOGIN ──
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user)
    return res.status(400).json({ message: "Invalid email or password" });

  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ── SAVE HISTORY ──
app.post("/api/history", authenticateToken, async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ message: "IP is required" });

  try {
    const { data, error } = await supabase
      .from("ip_history")
      .insert([{ user_id: req.user.id, ip }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Failed to save history:", err);
    res.status(500).json({ message: "Failed to save search history." });
  }
});

// ── DELETE HISTORY ──
app.delete("/api/history/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("ip_history")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Failed to delete history:", err);
    res.status(500).json({ message: "Failed to delete history" });
  }
});

// ── GET HISTORY ──
app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ip_history")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch history:", err);
    res.status(500).json({ message: "Failed to fetch search history." });
  }
});

// ── HEALTH CHECK ──
app.get("/", (_, res) => res.send("API running 🚀"));

// ── PORT ──
const PORT = process.env.PORT || 8000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;