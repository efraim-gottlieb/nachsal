import { sendSms } from "./sms.service.js";
import { upsertOrefAlerts, cleanExpiredOrefAlerts } from "./orefAlert.service.js";
import { getSoldiersByCities, getCommandersWithSmsAlerts, getSoldierCities } from "./user.service.js";
import { createEvent } from "./event.service.js";
import { createSoldierStatuses } from "./soldierStatus.service.js";

let previousAlertCities = [];
let isAlertActive = false;

// Match Oref granular city names to soldier city names
// e.g. "ירושלים - כפר עקב" matches soldier city "ירושלים"
function matchOrefCitiesToSoldierCities(orefCities, soldierCities) {
  const matched = new Set();
  for (const orefCity of orefCities) {
    for (const soldierCity of soldierCities) {
      if (orefCity === soldierCity || orefCity.startsWith(soldierCity + " ")) {
        matched.add(soldierCity);
      }
    }
  }
  return [...matched];
}

const ALLOWED_TITLES = ["ירי רקטות וטילים", "חדירת כלי טיס עוין"];

// Process an Oref alert (called from server polling OR client socket)
export async function processOrefAlert(alertData, io) {
  const cities = alertData.data || [];
  const title = alertData.title || "";
  const desc = alertData.desc || "";

  if (!ALLOWED_TITLES.includes(title)) return;
  if (!isAlertActive || JSON.stringify(cities) !== JSON.stringify(previousAlertCities)) {
    isAlertActive = true;
    previousAlertCities = cities;

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
    const matchedCities = matchOrefCitiesToSoldierCities(cities, soldierCitiesList);
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
}

// Mark alert as ended
export function processOrefAlertEnd(io) {
  if (isAlertActive) {
    console.log(`[Oref] Alert ended for: ${previousAlertCities.join(", ")}`);
    io.to("commanders").emit("oref_alert", {
      status: "ended",
      cities: previousAlertCities,
      timestamp: new Date(),
    });
    isAlertActive = false;
    previousAlertCities = [];
  }
}

// Server-side polling (works when server is in Israel, fallback when abroad)
export function startOrefPolling(io) {
  const interval = parseInt(process.env.OREF_POLL_INTERVAL) || 3000;

  setInterval(async () => {
    try {
      const response = await fetch("https://www.oref.org.il/WarningMessages/alert/alerts.json", {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://www.oref.org.il/",
        },
      });

      const text = await response.text();

      if (text.length > 2) {
        const alertData = JSON.parse(text);
        await processOrefAlert(alertData, io);
      } else {
        processOrefAlertEnd(io);
      }
    } catch (err) {
      // Silently continue polling on error
    }
  }, interval);

  console.log(`[Oref] Polling started (every ${interval}ms)`);
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