import { updateSoldierStatus, getPendingStatusForSoldier } from "../services/soldierStatus.service.js";

export async function respondToEvent(req, res) {
  const { event_id, status } = req.body;

  if (!event_id || !status) {
    return res.status(400).json({ message: "event_id and status are required" });
  }

  if (!["ok", "not_ok"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'ok' or 'not_ok'" });
  }

  const soldierStatus = await updateSoldierStatus(req.user._id, event_id, status);
  if (!soldierStatus) {
    return res.status(404).json({ message: "Status record not found" });
  }

  // Notify commanders in real-time
  const io = req.app.get("io");
  if (io) {
    io.to("commanders").emit("soldier_responded", {
      event_id,
      soldier_id: req.user._id,
      soldier_name: req.user.name,
      soldier_city: req.user.city,
      status,
    });
  }

  res.json(soldierStatus);
}

export async function getMyPendingSurveys(req, res) {
  const statuses = await getPendingStatusForSoldier(req.user._id);
  res.json(statuses);
}
