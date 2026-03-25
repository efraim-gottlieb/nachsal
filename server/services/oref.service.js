import { sendSms } from "./sms.service.js";
import { upsertOrefAlerts, cleanExpiredOrefAlerts } from "./orefAlert.service.js";
import { getSoldiersByCities, getCommandersWithSmsAlerts, getSoldierCities } from "./user.service.js";
import { createEvent } from "./event.service.js";
import { createSoldierStatuses } from "./soldierStatus.service.js";

let previousAlertIds = new Set();
let isAlertActive = false;
let alertEndTimeout = null;

// Tzeva Adom API threat codes → Hebrew titles
const THREAT_TITLES = {
  0: "ירי רקטות וטילים",
  1: "חדירת כלי טיס עוין",
};

// Match Oref/Tzeva Adom granular city names to soldier city names
// e.g. "ירושלים - מערב" matches soldier city "ירושלים"
function matchAlertCitiesToSoldierCities(alertCities, soldierCities) {
  const matched = new Set();
  for (const alertCity of alertCities) {
    for (const soldierCity of soldierCities) {
      if (alertCity === soldierCity || alertCity.startsWith(soldierCity + " ") || alertCity.includes(" - ") && alertCity.split(" - ")[0] === soldierCity) {
        matched.add(soldierCity);
      }
    }
  }
  return [...matched];
}

// Normalize tzevaadom API response into a unified format
// Input: [{notificationId, time, threat, isDrill, cities: [...]}, ...]
// Output: { cities: [...], title: "...", desc: "" } or null
function normalizeTzevaadomData(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return null;

  const newNotifications = notifications.filter(n => !n.isDrill && !previousAlertIds.has(n.notificationId));
  if (newNotifications.length === 0) return null;

  const allCities = [];
  let title = "";
  for (const n of newNotifications) {
    if (n.cities) allCities.push(...n.cities);
    if (!title) title = THREAT_TITLES[n.threat] || "התראה";
    previousAlertIds.add(n.notificationId);
  }

  // Keep only last 200 IDs to prevent memory leak
  if (previousAlertIds.size > 200) {
    const arr = [...previousAlertIds];
    previousAlertIds = new Set(arr.slice(-100));
  }

  return { cities: [...new Set(allCities)], title, desc: "" };
}

// Process an alert (called from server polling)
export async function processOrefAlert(alertData, io) {
  const cities = alertData.cities || alertData.data || [];
  const title = alertData.title || "";
  const desc = alertData.desc || "";

  if (cities.length === 0) return;

  isAlertActive = true;
  if (alertEndTimeout) { clearTimeout(alertEndTimeout); alertEndTimeout = null; }

  await upsertOrefAlerts(cities, title, desc);
  await cleanExpiredOrefAlerts();

  console.log(`[Oref] ${title} - ${cities.join(", ")}`);

  // Emit to commanders
  io.to("commanders").emit("oref_alert", {
    status: "active",
    cities,
    title,
    desc,
    timestamp: new Date(),
  });

  // Find soldiers in affected cities (fuzzy match) and create event
  const soldierCitiesList = await getSoldierCities();
  const matchedCities = matchAlertCitiesToSoldierCities(cities, soldierCitiesList);
  const soldiers = await getSoldiersByCities(matchedCities);

  if (soldiers.length > 0) {
    const event = await createEvent(matchedCities, null, true);
    const soldierIds = soldiers.map((s) => s._id);
    await createSoldierStatuses(event._id, soldierIds);

    io.to("commanders").emit("event_created", {
      event_id: event._id,
      cities: matchedCities,
      oref_alert: true,
    });

    io.to("commanders").emit("oref_soldiers_affected", {
      cities: matchedCities,
      title,
      soldiers: soldiers.map((s) => ({
        _id: s._id,
        name: s.name,
        city: s.city,
        phone: s.phone,
      })),
    });

    for (const soldier of soldiers) {
      io.to(`user_${soldier._id}`).emit("new_event_survey", {
        event_id: event._id,
        cities: event.cities,
        message: `התראה פעילה באזור ${soldier.city}! האם אתה בסדר?`,
      });
    }

    for (const soldier of soldiers) {
      if (soldier.phone) {
        try {
          await sendSms(soldier.phone, `🛡️ מערכת נכס"ל\nשלום ${soldier.name}, התראה פעילה באזור ${soldier.city}!\nאנא השב עם 1 אם אתה בסדר, או 2 אם אתה זקוק לעזרה.`);
        } catch (e) {
          console.error(`SMS failed for ${soldier.phone}:`, e.message);
        }
      }
    }

    try {
      const smsCommanders = await getCommandersWithSmsAlerts();
      const soldiersByCity = {};
      for (const s of soldiers) {
        soldiersByCity[s.city] = (soldiersByCity[s.city] || 0) + 1;
      }
      const cityBreakdown = Object.entries(soldiersByCity)
        .map(([city, count]) => `${city} - ${count} חיילים`)
        .join("\n");
      const cmdMessage = `🛡️ מערכת נכס"ל - התראה למפקד\n\n${title}\n\n${cityBreakdown}\n\nסה"כ: ${soldiers.length} חיילים באזור מאוים`;
      for (const cmd of smsCommanders) {
        if (cmd.phone) {
          try {
            await sendSms(cmd.phone, cmdMessage);
          } catch (e) {
            console.error(`SMS failed for commander ${cmd.phone}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error("[Oref] Failed to send commander SMS:", e.message);
    }
  }
}

// Schedule alert end after no new notifications for 2 minutes
function scheduleAlertEnd(io) {
  if (alertEndTimeout) clearTimeout(alertEndTimeout);
  alertEndTimeout = setTimeout(() => {
    if (isAlertActive) {
      console.log(`[Oref] Alert ended (no new notifications)`);
      io.to("commanders").emit("oref_alert", {
        status: "ended",
        cities: [],
        timestamp: new Date(),
      });
      isAlertActive = false;
    }
  }, 2 * 60 * 1000);
}

// Server-side polling via Tzeva Adom API (works from anywhere, no geo-blocking)
export function startOrefPolling(io) {
  const interval = parseInt(process.env.OREF_POLL_INTERVAL) || 3000;

  setInterval(async () => {
    try {
      const response = await fetch("https://api.tzevaadom.co.il/notifications", {
        headers: { "Accept": "application/json" },
      });

      const notifications = await response.json();
      const alertData = normalizeTzevaadomData(notifications);

      if (alertData) {
        await processOrefAlert(alertData, io);
        scheduleAlertEnd(io);
      }
    } catch (err) {
      // Silently continue polling on error
    }
  }, interval);

  console.log(`[Oref] Polling started via Tzeva Adom API (every ${interval}ms)`);
}

export async function triggerEventFromOref(cities, io) {
  // Create a system event from Oref alert
  const event = await createEvent(cities, null, true);

  const soldiers = await getSoldiersByCities(cities);
  if (soldiers.length > 0) {
    const soldierIds = soldiers.map((s) => s._id);
    await createSoldierStatuses(event._id, soldierIds);

    for (const soldier of soldiers) {
      io.to(`user_${soldier._id}`).emit("new_event_survey", {
        event_id: event._id,
        cities: event.cities,
        message: `התראה פעילה באזור ${soldier.city}! האם אתה בסדר?`,
      });
    }

    // Send SMS to all soldiers
    for (const soldier of soldiers) {
      if (soldier.phone) {
        try {
          await sendSms(soldier.phone, `התראה פעילה באזור ${soldier.city}! האם אתה בסדר?`);
        } catch (e) {
          console.error(`SMS failed for ${soldier.phone}:`, e.message);
        }
      }
    }

    return { event, affected_soldiers: soldiers.length };
}
}