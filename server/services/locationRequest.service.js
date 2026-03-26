import { LocationRequest } from "../db/models/LocationRequest.js";
import { User } from "../db/models/User.js";

export async function createLocationRequest(createdBy) {
  try {
    const request = await LocationRequest.create({ created_by: createdBy });
    return request;
  } catch (err) {
    throw new Error(err);
  }
}

export async function getLatestActiveRequest() {
  const request = await LocationRequest.findOne({ status: "active" })
    .sort({ createdAt: -1 })
    .populate("created_by", "name");
  return request;
}

export async function getLocationRequestById(id) {
  const request = await LocationRequest.findOne({ _id: id })
    .populate("created_by", "name");
  return request;
}

export async function closeLocationRequest(id) {
  const request = await LocationRequest.findOneAndUpdate(
    { _id: id },
    { status: "closed" },
    { new: true }
  );
  return request;
}

export async function getSoldiersLocationStatus(requestId) {
  const request = await LocationRequest.findOne({ _id: requestId });
  if (!request) return null;

  const soldiers = await User.find({ user_type: "soldier" }).select("-password");

  return soldiers.map((s) => ({
    _id: s._id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    city: s.city,
    updatedLocation: s.updatedAt > request.createdAt,
    lastUpdate: s.updatedAt,
  }));
}

export async function getAllLocationRequests() {
  const requests = await LocationRequest.find()
    .sort({ createdAt: -1 })
    .populate("created_by", "name");
  return requests;
}
