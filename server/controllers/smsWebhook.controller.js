import {
  convertPhoneToLocal,
  findSoldierByPhone,
  findActiveEventForSoldier,
  updateStatusFromSms,
} from "../services/smsWebhook.service.js";
import { sendSms } from "../services/sms.service.js";

export async function handleIncomingSms(req, res) {
  console.log(`[SMS-Webhook] Raw body:`, JSON.stringify(req.body));

  // 019 webhook may send different field names
  const message = req.body.message || req.body.text || req.body.Message || req.body.Text || req.body.msg;
  const phone = req.body.phone || req.body.sender || req.body.Phone || req.body.Sender || req.body.from || req.body.From;

  if (!message || !phone) {
    console.log(`[SMS-Webhook] Missing fields. message=${message}, phone=${phone}`);
    return res.status(400).json({ message: "Missing message or phone" });
  }

  const localPhone = convertPhoneToLocal(phone);

  const soldier = await findSoldierByPhone(localPhone);
  if (!soldier) {
    console.log(`[SMS-Webhook] Unknown phone: ${localPhone}`);
    return res.json({ ok: true, action: "ignored", reason: "unknown_phone" });
  }

  const event = await findActiveEventForSoldier(soldier);
  if (!event) {
    console.log(`[SMS-Webhook] No active event for ${soldier.name} (${localPhone})`);
    return res.json({ ok: true, action: "ignored", reason: "no_active_event" });
  }

  const updatedStatus = await updateStatusFromSms(soldier._id, event._id, message);
  if (!updatedStatus) {
    console.log(`[SMS-Webhook] Invalid message or already responded: "${message}" from ${soldier.name}`);
    return res.json({ ok: true, action: "ignored", reason: "invalid_message_or_already_responded" });
  }

  console.log(`[SMS-Webhook] ${soldier.name} responded "${message}" (${updatedStatus.status}) for event ${event._id}`);

  const io = req.app.get("io");
  if (io) {
    io.to("commanders").emit("soldier_responded", {
      event_id: event._id,
      soldier_id: soldier._id,
      soldier_name: soldier.name,
      soldier_city: soldier.city,
      status: updatedStatus.status,
    });
  }

  // שליחת SMS תגובה לחייל
  try {
    if (updatedStatus.status === "ok") {
      await sendSms(localPhone, "👍");
    } else if (updatedStatus.status === "not_ok") {
      await sendSms(localPhone, "המפקד עודכן, תחזיק חזק!");
    }
  } catch (err) {
    console.error(`[SMS-Webhook] Failed to send reply SMS to ${localPhone}:`, err.message);
  }

  res.json({ ok: true, action: "updated", status: updatedStatus.status });
}
