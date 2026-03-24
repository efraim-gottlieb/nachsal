import { updateUserPhone } from "../services/user.service.js";
export async function updatePhone(req, res) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: "Phone is required" });
  }
  const user = await updateUserPhone(req.user._id, phone);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(user);
}
import {
  getAllSoldiers,
  getSoldiersByCommander,
  updateUserLocation,
  getUserById,
  getSoldierCities,
  updateSoldierById,
  deleteSoldierById,
  createUser,
  getUserByEmail,
  getAllCommanders,
  updateCommanderById,
  deleteCommanderById,
} from "../services/user.service.js";

export async function updateLocation(req, res) {
  const { city, lat, lng } = req.body;

  if (!city) {
    return res.status(400).json({ message: "City is required" });
  }

  const user = await updateUserLocation(req.user._id, city, lat || 0, lng || 0);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Notify commanders via socket
  const io = req.app.get("io");
  if (io) {
    io.to("commanders").emit("soldier_location_updated", {
      soldier_id: user._id,
      name: user.name,
      city: user.city,
      lat: user.lat,
      lng: user.lng,
    });
  }

  res.json(user);
}

export async function getMySoldiers(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const soldiers = await getSoldiersByCommander(req.user._id);
  res.json(soldiers);
}

export async function listAllSoldiers(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const soldiers = await getAllSoldiers();
  res.json(soldiers);
}

export async function getSoldier(req, res) {
  const { id } = req.params;
  const soldier = await getUserById(id);
  if (!soldier) {
    return res.status(404).json({ message: "Soldier not found" });
  }
  res.json(soldier);
}

export async function listSoldierCities(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const cities = await getSoldierCities();
  res.json(cities);
}

export async function createSoldier(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { name, email, password, phone, city } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "name, email, password and phone are required" });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const soldier = await createUser(name, email, password, phone, "soldier", req.user._id);
  if (city) {
    await updateSoldierById(soldier._id, { city });
  }

  const result = await getUserById(soldier._id);
  res.status(201).json(result);
}

export async function updateSoldier(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { name, phone, city, email } = req.body;

  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (city !== undefined) updates.city = city;
  if (email) updates.email = email;

  const soldier = await updateSoldierById(id, updates);
  if (!soldier) {
    return res.status(404).json({ message: "Soldier not found" });
  }
  res.json(soldier);
}

export async function deleteSoldier(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const result = await deleteSoldierById(id);
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Soldier not found" });
  }
  res.json({ message: "Soldier deleted" });
}

// --- Commander management ---

export async function listAllCommanders(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const commanders = await getAllCommanders();
  res.json(commanders);
}

export async function createCommander(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { name, email, password, phone, sms_alerts } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "name, email, password and phone are required" });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const commander = await createUser(name, email, password, phone, "commander", null);
  if (sms_alerts) {
    await updateCommanderById(commander._id, { sms_alerts: true });
  }

  const result = await getUserById(commander._id);
  res.status(201).json(result);
}

export async function updateCommander(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { name, phone, email, sms_alerts } = req.body;

  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (email) updates.email = email;
  if (sms_alerts !== undefined) updates.sms_alerts = sms_alerts;

  const commander = await updateCommanderById(id, updates);
  if (!commander) {
    return res.status(404).json({ message: "Commander not found" });
  }
  res.json(commander);
}

export async function deleteCommander(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  if (id === req.user._id.toString()) {
    return res.status(400).json({ message: "Cannot delete yourself" });
  }
  const result = await deleteCommanderById(id);
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Commander not found" });
  }
  res.json({ message: "Commander deleted" });
}

export async function toggleSmsAlerts(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { sms_alerts } = req.body;

  const commander = await updateCommanderById(id, { sms_alerts: !!sms_alerts });
  if (!commander) {
    return res.status(404).json({ message: "Commander not found" });
  }
  res.json(commander);
}
