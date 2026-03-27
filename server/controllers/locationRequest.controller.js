import {
  createLocationRequest,
  getLatestActiveRequest,
  getLocationRequestById,
  closeLocationRequest,
  getSoldiersLocationStatus,
  getAllLocationRequests,
  toggleManualOverride,
} from "../services/locationRequest.service.js";
import { getAllSoldiers, getUserById } from "../services/user.service.js";
import { sendSms } from "../services/sms.service.js";

export async function sendLocationRequest(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const request = await createLocationRequest(req.user._id);

  const io = req.app.get("io");

  // Emit socket event to all soldiers
  io.emit("location_request", {
    request_id: request._id,
    message: "נדרש עדכון מיקום — יש להיכנס לאזור האישי ולעדכן",
    link: "https://nachsal-system.onrender.com/soldier",
    createdAt: request.createdAt,
  });

  // Send SMS to all soldiers in background
  const soldiers = await getAllSoldiers();
  let smsSent = 0;
  let smsFailed = 0;

  const smsMessage = `🛡️ מערכת נכס"ל\n\nנדרש עדכון מיקום.\nיש להיכנס לאזור האישי ולעדכן את המיקום שלך:\nhttps://nachsal-system.onrender.com/soldier`;

  for (const soldier of soldiers) {
    if (soldier.phone) {
      try {
        await sendSms(soldier.phone, smsMessage);
        smsSent++;
      } catch (err) {
        smsFailed++;
        console.error(`[LocationRequest] SMS failed for ${soldier.phone}:`, err.message);
      }
    }
  }

  // Notify commanders about the request
  io.to("commanders").emit("location_request_sent", {
    request_id: request._id,
    created_by: req.user.name,
    total_soldiers: soldiers.length,
    sms_sent: smsSent,
    sms_failed: smsFailed,
    createdAt: request.createdAt,
  });

  res.status(201).json({
    request,
    total_soldiers: soldiers.length,
    sms_sent: smsSent,
    sms_failed: smsFailed,
  });
}

export async function getLatestRequest(req, res) {
  const request = await getLatestActiveRequest();
  res.json(request);
}

export async function getRequestStatuses(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const statuses = await getSoldiersLocationStatus(id);
  if (!statuses) {
    return res.status(404).json({ message: "Location request not found" });
  }
  res.json(statuses);
}

export async function closeRequest(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const request = await closeLocationRequest(id);
  if (!request) {
    return res.status(404).json({ message: "Location request not found" });
  }

  const io = req.app.get("io");
  io.emit("location_request_closed", { request_id: id });

  res.json(request);
}

export async function listAllRequests(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const requests = await getAllLocationRequests();
  res.json(requests);
}

export async function sendPersonalLocationRequest(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { soldierId } = req.params;
  const soldier = await getUserById(soldierId);
  if (!soldier) {
    return res.status(404).json({ message: "Soldier not found" });
  }

  const io = req.app.get("io");

  // Emit socket event to the specific soldier
  io.to(`user_${soldierId}`).emit("location_request", {
    message: "נדרש עדכון מיקום — יש להיכנס לאזור האישי ולעדכן",
    link: "https://nachsal-system.onrender.com/soldier",
    personal: true,
    createdAt: new Date(),
  });

  // Send SMS to the soldier
  let smsSent = false;
  const smsMessage = `🛡️ מערכת נכס"ל\n\nנדרש עדכון מיקום.\nיש להיכנס לאזור האישי ולעדכן את המיקום שלך:\nhttps://nachsal-system.onrender.com/soldier`;

  if (soldier.phone) {
    try {
      await sendSms(soldier.phone, smsMessage);
      smsSent = true;
    } catch (err) {
      console.error(`[PersonalLocationRequest] SMS failed for ${soldier.phone}:`, err.message);
    }
  }

  res.json({
    soldier: { _id: soldier._id, name: soldier.name, phone: soldier.phone },
    sms_sent: smsSent,
  });
}

export async function toggleSoldierLocationOverride(req, res) {
  if (!["commander", "admin"].includes(req.user.user_type)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id, soldierId } = req.params;
  const request = await toggleManualOverride(id, soldierId);
  if (!request) {
    return res.status(404).json({ message: "Location request not found" });
  }

  res.json({ message: "Override toggled" });
}
