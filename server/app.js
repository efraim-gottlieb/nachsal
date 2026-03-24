// --- DEMO OREF ALERT ENDPOINT (no auth) ---
import { triggerEventFromOref } from "./services/oref.service.js";
import { sendSms } from "./services/sms.service.js";

// Endpoint to trigger fake Oref alert for Jerusalem and Tel Aviv

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./db/mongo.js";
import { setupSocket } from "./services/socket.service.js";
import { startOrefPolling } from "./services/oref.service.js";
import errorHandling from "./middlewares/errorHandling.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import eventRoutes from "./routes/event.routes.js";
import statusRoutes from "./routes/status.routes.js";

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Store io instance on app for controllers to use
app.set("io", io);


// Middleware
app.use(cors());
app.use(express.json());

// בדיקת שליחת SMS ידנית - לפני השרת הסטטי
app.get("/api/test-sms", async (req, res) => {
  try {
    const result = await sendSms("0549674146", "בדיקת SMS מהמערכת nachsal");
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve React build
const clientDist = join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/status", statusRoutes);

app.get("/demo-oref-alert", async (req, res) => {
  try {
    const io = req.app.get("io");
    const cities = ["ירושלים", "תל אביב"];
    // Use the same title as real Oref alert
    await io.to("commanders").emit("oref_alert", {
      status: "active",
      cities,
      title: "ירי רקטות וטילים",
      desc: "התראת דמו ידנית",
      timestamp: new Date(),
    });
    // לא ליצור אירוע אמיתי במערכת
    res.json({ ok: true, message: "התראת דמו נשלחה לירושלים ותל אביב (ללא יצירת אירוע)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Serve demo page for Oref alert (no login required)
app.get("/demo-oref", (req, res) => {
  res.sendFile(join(__dirname, "demo-oref.html"));
});

// SPA fallback — serve index.html for all non-API routes
app.get("/{*splat}", (req, res) => {
  res.sendFile(join(clientDist, "index.html"));
});

// בדיקת שליחת SMS ידנית
app.get("/api/test-sms", async (req, res) => {
  try {
    const result = await sendSms("0549674146", "בדיקת SMS מהמערכת nachsal");
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Error handling
app.use(errorHandling);

// Start
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  // Setup Socket.IO
  setupSocket(io);

  // Start Oref polling
  startOrefPolling(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Commander dashboard: http://localhost:${PORT}/commander/`);
    console.log(`Soldier panel: http://localhost:${PORT}/soldier/`);
  });
});
