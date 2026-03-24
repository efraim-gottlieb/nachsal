import { OrefAlert } from "../db/models/OrefAlert.js";

// Save or update alert for each city (with title & desc)
export async function upsertOrefAlerts(cities, title = "", desc = "") {
  const now = new Date();
  for (const city of cities) {
    await OrefAlert.findOneAndUpdate(
      { city },
      { city, title, desc, receivedAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

// Clean up alerts older than 10 minutes
export async function cleanExpiredOrefAlerts() {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  await OrefAlert.deleteMany({ receivedAt: { $lt: since } });
}

// Get all alerts from last 10 minutes
export async function getRecentOrefAlerts() {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  return OrefAlert.find({ receivedAt: { $gte: since } });
}
