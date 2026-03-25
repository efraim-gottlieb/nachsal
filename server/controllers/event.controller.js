import { createEvent, getActiveEvents, getEventById, endEvent, getAllEvents } from "../services/event.service.js";
import { createSoldierStatuses, getStatusesByEvent } from "../services/soldierStatus.service.js";
import { getSoldiersByCities } from "../services/user.service.js";
import { sendSms } from "../services/sms.service.js";

export async function triggerEvent(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { cities } = req.body;
  if (!cities || !cities.length) {
    return res.status(400).json({ message: "Cities are required" });
  }

  const event = await createEvent(cities, req.user._id);

  // Find soldiers in affected cities
  const soldiers = await getSoldiersByCities(cities);
  console.log(`[triggerEvent] Event ${event._id} created for cities: ${cities.join(", ")}. Found ${soldiers.length} soldiers.`);

  if (soldiers.length > 0) {
    const soldierIds = soldiers.map((s) => s._id);
    await createSoldierStatuses(event._id, soldierIds);

    // Notify soldiers via socket
    const io = req.app.get("io");
    if (io) {
      for (const soldier of soldiers) {
        io.to(`user_${soldier._id}`).emit("new_event_survey", {
          event_id: event._id,
          cities: event.cities,
          message: `התראה פעילה באזור ${soldier.city}! האם אתה בסדר?` + "\nאנא השב עם 1 אם אתה בסדר, או 2 אם אתה זקוק לעזרה.",
        });
      }

      // Notify commanders
      io.to("commanders").emit("event_created", {
        event_id: event._id,
        cities: event.cities,
        soldiers_count: soldiers.length,
      });
    }

    // Send SMS to all soldiers in affected cities
    for (const soldier of soldiers) {
      if (soldier.phone) {
        try {
          console.log(`[triggerEvent] Sending SMS to ${soldier.name} (${soldier.phone})`);
          await sendSms(soldier.phone, `🛡️ מערכת נכס"ל\nשלום ${soldier.name}, התראה פעילה באזור ${soldier.city}! האם אתה בסדר?\nאנא השב עם 1 אם אתה בסדר, או 2 אם אתה זקוק לעזרה.`);
          console.log(`[triggerEvent] SMS sent successfully to ${soldier.phone}`);
        } catch (e) {
          console.error(`[triggerEvent] SMS failed for ${soldier.phone}:`, e.message);
        }
      }
    }
  }

  res.status(201).json({
    event,
    affected_soldiers: soldiers.length,
  });
}

export async function listActiveEvents(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const events = await getActiveEvents();
  res.json(events);
}

export async function listAllEvents(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const events = await getAllEvents();
  res.json(events);
}

export async function getEvent(req, res) {
  const { id } = req.params;
  const event = await getEventById(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json(event);
}

export async function getEventStatuses(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const statuses = await getStatusesByEvent(id);
  const allOk = statuses.length > 0 && statuses.every((s) => s.status === "ok");
  res.json({ statuses, allOk });
}

export async function closeEvent(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const event = await endEvent(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const io = req.app.get("io");
  if (io) {
    io.emit("event_ended", { event_id: event._id, cities: event.cities });
  }

  res.json(event);
}
