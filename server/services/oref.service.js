import { createEvent } from "../services/event.service.js";
import { createSoldierStatuses } from "../services/soldierStatus.service.js";
import { getSoldiersByCities } from "../services/user.service.js";

let previousAlertCities = [];
let isAlertActive = false;

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
        // Active alert - API format:
        // { id, cat, title: "ירי רקטות וטילים", data: ["כרם שלום", ...], desc: "..." }
        const alertData = JSON.parse(text);
        const cities = alertData.data || [];
        const title = alertData.title || "";
        const desc = alertData.desc || "";

        if (!isAlertActive || JSON.stringify(cities) !== JSON.stringify(previousAlertCities)) {
          isAlertActive = true;
          previousAlertCities = cities;

          console.log(`[Oref] ${title} - ${cities.join(", ")}`);

          // Emit to commanders
          io.to("commanders").emit("oref_alert", {
            status: "active",
            cities,
            title,
            desc,
            timestamp: new Date(),
          });

          // Find soldiers in affected cities and notify them
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
          }
        }
      } else if (isAlertActive) {
        // Alert ended
        console.log(`[Oref] Alert ended for: ${previousAlertCities.join(", ")}`);

        io.to("commanders").emit("oref_alert", {
          status: "ended",
          cities: previousAlertCities,
          timestamp: new Date(),
        });

        isAlertActive = false;
        previousAlertCities = [];
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
  }

  return { event, affected_soldiers: soldiers.length };
}
