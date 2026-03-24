import dotenv from "dotenv";
dotenv.config();


async function sendSMS(phone, message) {
  const SMS_019_TOKEN = process.env.SMS_019_TOKEN;
  const SMS_019_USER = process.env.SMS_019_USER;
  const SMS_019_URL = "https://019sms.co.il/api";

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

  const res = await fetch(
    SMS_019_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMS_019_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to send SMS");
  }
  return data;
}
console.log(await sendSMS("0549674146", "בדיקת SMS ישירה מהסקריפט"));
