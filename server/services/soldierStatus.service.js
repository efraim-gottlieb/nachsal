import { SoldierStatus } from "../db/models/SoldierStatus.js";

export async function createSoldierStatuses(eventId, soldierIds) {
  try {
    const statuses = soldierIds.map((userId) => ({
      user_id: userId,
      event_id: eventId,
      status: "pending",
    }));
    const result = await SoldierStatus.insertMany(statuses, { ordered: false });
    return result;
  } catch (err) {
    throw new Error(err);
  }
}

export async function updateSoldierStatus(userId, eventId, status) {
  const soldierStatus = await SoldierStatus.findOneAndUpdate(
    { user_id: userId, event_id: eventId },
    { status, responded_at: new Date() },
    { new: true }
  );
  return soldierStatus;
}

export async function getStatusesByEvent(eventId) {
  const statuses = await SoldierStatus.find({ event_id: eventId }).populate(
    "user_id",
    "name phone city lat lng"
  );
  return statuses;
}

export async function getPendingStatusForSoldier(userId) {
  const statuses = await SoldierStatus.find({
    user_id: userId,
    status: "pending",
  }).populate({
    path: "event_id",
    match: { status: "active" },
  });
  return statuses.filter((s) => s.event_id !== null);
}

export async function getStatusByUserAndEvent(userId, eventId) {
  const status = await SoldierStatus.findOne({ user_id: userId, event_id: eventId });
  return status;
}

export async function updateSoldierStatusById(statusId, status) {
  const soldierStatus = await SoldierStatus.findOneAndUpdate(
    { _id: statusId },
    { status, responded_at: new Date() },
    { new: true }
  ).populate("user_id", "name phone city");
  return soldierStatus;
}
