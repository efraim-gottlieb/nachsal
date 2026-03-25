import { Event } from "../db/models/Event.js";

export async function createEvent(cities, createdBy, orefAlert = false) {
  try {
    const event = await Event.create({
      cities,
      created_by: createdBy,
      oref_alert: orefAlert,
    });
    return event;
  } catch (err) {
    throw new Error(err);
  }
}

export async function getActiveEvents() {
  const events = await Event.find({ status: "active" }).sort({ createdAt: -1 }).populate("created_by", "name email");
  return events;
}

export async function getEventById(id) {
  const event = await Event.findOne({ _id: id }).populate("created_by", "name email");
  return event;
}

export async function endEvent(id) {
  const event = await Event.findOneAndUpdate(
    { _id: id },
    { status: "ended", ended_at: new Date() },
    { new: true }
  );
  return event;
}

export async function getAllEvents() {
  const events = await Event.find().sort({ createdAt: -1 }).populate("created_by", "name email");
  return events;
}
