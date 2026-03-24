import { OrefAlert } from "../db/models/OrefAlert.js";

// Save or update alert for each city
export async function upsertOrefAlerts(cities) {
  const now = new Date();
  for (const city of cities) {
    await OrefAlert.findOneAndUpdate(
      { city },
      { city, receivedAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

// Remove alerts for cities that are no longer active
export async function removeOrefAlerts(cities) {
  await OrefAlert.deleteMany({ city: { $nin: cities } });
}

// Get all alerts from last 15 minutes
export async function getRecentOrefAlerts() {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  return OrefAlert.find({ receivedAt: { $gte: since } });
}
