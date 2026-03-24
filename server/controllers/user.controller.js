import {
  getAllSoldiers,
  getSoldiersByCommander,
  updateUserLocation,
  getUserById,
  getSoldierCities,
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
