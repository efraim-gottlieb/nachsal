export async function updateUserPhone(userId, phone) {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { phone },
    { new: true }
  ).select("-password");
  return user;
}
import { User } from "../db/models/User.js";
import { encrypt } from "../utils/hash.js";

export async function createUser(name, email, password, phone, user_type, commander_id) {
  try {
    const hashedPassword = await encrypt(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      user_type,
      commander_id: commander_id || null,
    });
    return user;
  } catch (err) {
    throw new Error(err);
  }
}

export async function getUserByEmail(email) {
  const user = await User.findOne({ email });
  return user;
}

export async function getUserById(id) {
  const user = await User.findOne({ _id: id }).select("-password");
  return user;
}

export async function getAllSoldiers() {
  const soldiers = await User.find({ user_type: "soldier" }).select("-password");
  return soldiers;
}

export async function getSoldiersByCommander(commanderId) {
  const soldiers = await User.find({ commander_id: commanderId }).select("-password");
  return soldiers;
}

export async function getSoldiersByCities(cities) {
  const soldiers = await User.find({
    user_type: "soldier",
    city: { $in: cities },
  }).select("-password");
  return soldiers;
}

export async function getSoldierCities() {
  const cities = await User.distinct("city", { user_type: "soldier", city: { $ne: "" } });
  return cities;
}

export async function updateUserLocation(userId, city, lat, lng) {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { city, lat, lng },
    { new: true }
  ).select("-password");
  return user;
}

export async function updateSoldierById(id, updates) {
  const user = await User.findOneAndUpdate(
    { _id: id },
    updates,
    { new: true }
  ).select("-password");
  return user;
}

export async function deleteSoldierById(id) {
  const result = await User.deleteOne({ _id: id });
  return result;
}

export async function getAllCommanders() {
  const commanders = await User.find({ user_type: { $in: ["commander", "admin"] } }).select("-password");
  return commanders;
}

export async function updateCommanderById(id, updates) {
  const user = await User.findOneAndUpdate(
    { _id: id, user_type: { $in: ["commander", "admin"] } },
    updates,
    { new: true }
  ).select("-password");
  return user;
}

export async function deleteCommanderById(id) {
  const result = await User.deleteOne({ _id: id, user_type: { $in: ["commander", "admin"] } });
  return result;
}

export async function getCommandersWithSmsAlerts() {
  const commanders = await User.find({ user_type: { $in: ["commander", "admin"] }, sms_alerts: true }).select("-password");
  return commanders;
}
