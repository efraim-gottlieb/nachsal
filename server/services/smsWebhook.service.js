import { User } from "../db/models/User.js";
import { Event } from "../db/models/Event.js";
import { SoldierStatus } from "../db/models/SoldierStatus.js";

export function convertPhoneToLocal(phone) {
  if (!phone) return phone;
  // Handle +972, 972, 0 formats — strip everything non-digit first
  phone = phone.replace(/[^\d]/g, "");
  if (phone.startsWith("972")) {
    return "0" + phone.slice(3);
  }
  return phone;
}

export async function findSoldierByPhone(phone) {
  // Normalize: try exact match first, then try alternative formats
  let soldier = await User.findOne({ phone, user_type: "soldier" });
  if (soldier) return soldier;

  // Try matching with/without leading 0 / 972 prefix
  const stripped = phone.startsWith("0") ? phone.slice(1) : phone;
  const withZero = "0" + stripped;
  const with972 = "972" + stripped;
  const withPlus972 = "+972" + stripped;

  soldier = await User.findOne({
    phone: { $in: [withZero, with972, withPlus972, stripped] },
    user_type: "soldier",
  });
  return soldier;
}

export async function findActiveEventForSoldier(soldier) {
  const event = await Event.findOne({
    status: "active",
    cities: soldier.city,
  });
  return event;
}

export async function updateStatusFromSms(soldierId, eventId, message) {
  const statusMap = { "1": "ok", "2": "not_ok" };
  const status = statusMap[message.trim()];
  if (!status) return null;

  const soldierStatus = await SoldierStatus.findOneAndUpdate(
    { user_id: soldierId, event_id: eventId, status: "pending" },
    { status, responded_at: new Date() },
    { new: true }
  );
  return soldierStatus;
}
