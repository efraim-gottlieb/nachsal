import dotenv from "dotenv";
dotenv.config();


const SMS_019_TOKEN = process.env.SMS_019_TOKEN;
const SMS_019_USER = process.env.SMS_019_USER;
const SMS_019_URL = "https://019sms.co.il/api";

/**
 * שולח SMS דרך 019 לכל מספר ישראלי (API עם user ו-token בהדר)
 * @param {string} phone - מספר טלפון בפורמט 05XXXXXXXX
 * @param {string} message - תוכן ההודעה
 * @returns {Promise<object>} - תשובת ה-API
 */
export async function sendSms(phone, message) {
  if (!SMS_019_TOKEN) throw new Error("Missing SMS_019_TOKEN env var");
  if (!SMS_019_USER) throw new Error("Missing SMS_019_USER env var");
  const body = {
    sms: {
      user: {
        username: SMS_019_USER,
      },
      source: "0559687420",
      destinations: {
        phone: phone,
      },
      message: message,
    },
  };

  const res =  await fetch(
    SMS_019_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMS_019_TOKEN}`
      },
      body: JSON.stringify(body)
    }
  );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to send SMS");
    }
    return data;
}
