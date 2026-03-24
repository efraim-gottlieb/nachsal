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

// SPA fallback — serve index.html for all non-API routes
app.get("/{*splat}", (req, res) => {
  res.sendFile(join(clientDist, "index.html"));
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
