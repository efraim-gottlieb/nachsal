import { verifyToken } from "../utils/token.js";
import { User } from "../db/models/User.js";
import { processOrefAlert, processOrefAlertEnd } from "./oref.service.js";

export function setupSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findOne({ _id: decoded.id }).select("-password");
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] ${socket.user.name} connected (${socket.user.user_type})`);

    // Join personal room
    socket.join(`user_${socket.user._id}`);

    // Commanders join commanders room
    if (["commander", "admin"].includes(socket.user.user_type)) {
      socket.join("commanders");
    }

    // Soldiers join their city room
    if (socket.user.city) {
      socket.join(`city_${socket.user.city}`);
    }

    // Handle soldier city change
    socket.on("update_city", (data) => {
      if (socket.user.city) {
        socket.leave(`city_${socket.user.city}`);
      }
      socket.user.city = data.city;
      socket.join(`city_${data.city}`);
    });

    // Commanders can forward Oref alerts from their browser (Israeli IP)
    if (["commander", "admin"].includes(socket.user.user_type)) {
      socket.on("client_oref_alert", async (data) => {
        try {
          if (data.type === "alert" && data.alertData) {
            await processOrefAlert(data.alertData, io);
          } else if (data.type === "ended") {
            processOrefAlertEnd(io);
          }
        } catch (err) {
          console.error("[Socket] Error processing client oref alert:", err.message);
        }
      });
    }

    socket.on("disconnect", () => {
      console.log(`[Socket] ${socket.user.name} disconnected`);
    });
  });

  console.log("[Socket] Socket.IO initialized");
}
