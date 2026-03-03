import app from "../src/server.js";
import { createServer } from "http";

export default function handler(req, res) {
  // Wrap Express app
  const server = createServer(app);
  server.emit("request", req, res);
}