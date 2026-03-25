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


// Serve React build
const clientDist = join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/status", statusRoutes);

// Oref alerts - persistent (last 10 min)
import { getRecentOrefAlerts } from "./services/orefAlert.service.js";
import auth from "./middlewares/auth.middleware.js";
app.get("/api/oref-alerts", auth, async (req, res) => {
  const alerts = await getRecentOrefAlerts();
  res.json(alerts);
});

app.get("/demo-oref-alert", async (req, res) => {
  try {
    const io = req.app.get("io");
    const cities = req.query.cities ? req.query.cities.split(",") : ["ירושלים", "תל אביב"];
    const title = "ירי רקטות וטילים";
    const desc = "התראת דמו ידנית";

    // שמירה ב-DB כמו התראה אמיתית
    const { upsertOrefAlerts: upsert, cleanExpiredOrefAlerts: clean } = await import("./services/orefAlert.service.js");
    const { getSoldiersByCities, getCommandersWithSmsAlerts } = await import("./services/user.service.js");

    await upsert(cities, title, desc);
    await clean();

    console.log(`[Demo Oref] ${title} - ${cities.join(", ")}`);

    // שליחת socket למפקדים
    io.to("commanders").emit("oref_alert", {
      status: "active",
      cities,
      title,
      desc,
      timestamp: new Date(),
    });

    // מציאת חיילים מושפעים
    const soldiers = await getSoldiersByCities(cities);
    if (soldiers.length > 0) {
      io.to("commanders").emit("oref_soldiers_affected", {
        cities,
        title,
        soldiers: soldiers.map((s) => ({
          _id: s._id,
          name: s.name,
          city: s.city,
          phone: s.phone,
        })),
      });

      // שליחת SMS לחיילים
      for (const soldier of soldiers) {
        if (soldier.phone) {
          try {
            await sendSms(soldier.phone, `התראה פעילה באזור ${soldier.city}! אנא אשר מצבך במערכת.`);
          } catch (e) {
            console.error(`SMS failed for ${soldier.phone}:`, e.message);
          }
        }
      }

      // שליחת SMS למפקדים עם התראות
      try {
        const smsCommanders = await getCommandersWithSmsAlerts();
        const soldierCities = [...new Set(soldiers.map((s) => s.city))];
        const affectedCitiesStr = soldierCities.join(", ");
        for (const cmd of smsCommanders) {
          if (cmd.phone) {
            try {
              await sendSms(cmd.phone, `${title} באזור: ${affectedCitiesStr}. ${soldiers.length} חיילים באזור המאוים.`);
            } catch (e) {
              console.error(`SMS failed for commander ${cmd.phone}:`, e.message);
            }
          }
        }
      } catch (e) {
        console.error("[Demo Oref] Failed to send commander SMS:", e.message);
      }
    }

    res.json({
      ok: true,
      cities,
      soldiers_affected: soldiers.length,
      message: `התראת דמו הופעלה ל: ${cities.join(", ")}`,
    });
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

// Print body endpoint
app.post("/api/print-body", (req, res) => {
  console.log("[PRINT-BODY] " + JSON.stringify(req.body));
  res.json(req.body);
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
