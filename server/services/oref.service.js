import { sendSms } from "./sms.service.js";
import { upsertOrefAlerts, cleanExpiredOrefAlerts } from "./orefAlert.service.js";
import { getSoldiersByCities, getCommandersWithSmsAlerts } from "./user.service.js";
import { createEvent } from "./event.service.js";
import { createSoldierStatuses } from "./soldierStatus.service.js";

// פונקציה זו נמחקה כי יש כפילות בראש הקובץ
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

        // Only allow specific alert types
        const allowedTitles = [
         "ירי רקטות וטילים",
          "חדירת כלי טיס עוין",
        ];

        if (!allowedTitles.includes(title)) {
          // Ignore any alert that is not in the allowed list
          return;
        }

        if (!isAlertActive || JSON.stringify(cities) !== JSON.stringify(previousAlertCities)) {
          isAlertActive = true;
          previousAlertCities = cities;

          // Persist alerts in DB (with title & desc for 10 min display)
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

            // שליחת SMS לכל חייל בעיר שנפגעה
            for (const soldier of soldiers) {
              if (soldier.phone) {
                try {
                  await sendSms(soldier.phone, `התראה פעילה באזור ${soldier.city}! אנא אשר מצבך במערכת.`);
                } catch (e) {
                  console.error(`SMS failed for ${soldier.phone}:`, e.message);
                }
              }
            }

            // שליחת SMS למפקדים הרשומים לקבלת התראות
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
              console.error("[Oref] Failed to send commander SMS:", e.message);
            }
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