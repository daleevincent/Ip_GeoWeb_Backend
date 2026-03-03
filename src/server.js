import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

// ── CORS ──
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ── SUPABASE CLIENT ──
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


// ── JWT MIDDLEWARE ──
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
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

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid email or password" });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

// ── SAVE HISTORY ──
// ── SAVE HISTORY ──
app.post("/api/history", authenticateToken, async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ message: "IP is required" });

  try {
    // Insert history using service role key (backend can bypass RLS)
    const { data, error } = await supabase
      .from("ip_history")
      .insert([{ user_id: req.user.id, ip }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ message: "Failed to save search history" });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error saving history:", err);
    res.status(500).json({ message: "Server error saving history" });
  }
});

// ── GET HISTORY ──
app.get("/api/history", authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from("ip_history")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch history:", error);
    return res.status(500).json({ message: "Database error" });
  }

  res.json(data);
});

// ── DELETE HISTORY ──
app.delete("/api/history/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("ip_history")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ message: "Database error" });
  res.json({ message: "Deleted" });
});

// ── HEALTH CHECK ──
app.get("/", (_, res) => res.send("API running 🚀"));

const PORT = process.env.PORT || 8000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;