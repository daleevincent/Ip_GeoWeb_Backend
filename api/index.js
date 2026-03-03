// api/index.js
import serverless from "vercel-express";
import app from "../src/server.js";

export default serverless(app);