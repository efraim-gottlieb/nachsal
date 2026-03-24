import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./db/models/User.js";
import { encrypt } from "./utils/hash.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");

// Create commander
const commanderPassword = await encrypt("1234");
const commander = await User.findOneAndUpdate(
  { email: "eli@idf.il" },
  { name: "אלי כהן", email: "eli@idf.il", password: commanderPassword, phone: "0501234567", user_type: "commander", city: "תל אביב" },
  { upsert: true, new: true }
);
console.log(`✓ מפקד: eli@idf.il / 1234`);

await User.findOneAndUpdate(
  { email: "dana@idf.il" },
  { name: "דנה לוי", email: "dana@idf.il", password: commanderPassword, phone: "0501234568", user_type: "commander", city: "חיפה" },
  { upsert: true, new: true }
);
console.log(`✓ מפקד: dana@idf.il / 1234`);

// Create soldiers
const soldierPassword = await encrypt("1234");
const soldiers = [
  { name: "יוסי אברהם", email: "yossi@idf.il", phone: "0521111111", city: "תל אביב" },
  { name: "משה דוד", email: "moshe@idf.il", phone: "0522222222", city: "תל אביב" },
  { name: "אורי שלום", email: "ori@idf.il", phone: "0523333333", city: "ירושלים" },
  { name: "נועם ישראל", email: "noam@idf.il", phone: "0524444444", city: "חיפה" },
  { name: "עידו כהן", email: "ido@idf.il", phone: "0525555555", city: "באר שבע" },
  { name: "רון לוי", email: "ron@idf.il", phone: "0526666666", city: "אשדוד" },
  { name: "גיל שמש", email: "gil@idf.il", phone: "0527777777", city: "אשקלון" },
  { name: "תומר ברק", email: "tomer@idf.il", phone: "0528888888", city: "שדרות" },
  { name: "איתי גולן", email: "itay@idf.il", phone: "0529999999", city: "נתניה" },
  { name: "אדם פרץ", email: "adam@idf.il", phone: "0520000000", city: "קריית שמונה" },
];

for (const s of soldiers) {
  await User.findOneAndUpdate(
    { email: s.email },
    { ...s, password: soldierPassword, user_type: "soldier", commander_id: commander._id },
    { upsert: true, new: true }
  );
  console.log(`✓ חייל: ${s.email} / 1234 (${s.city})`);
}

console.log("\n=============================");
console.log("סיימנו! כל הסיסמאות: 1234");
console.log("=============================");
console.log("\nמפקדים:");
console.log("  eli@idf.il   (אלי כהן)");
console.log("  dana@idf.il  (דנה לוי)");
console.log("\nחיילים:");
soldiers.forEach(s => console.log(`  ${s.email.padEnd(16)} (${s.name} - ${s.city})`));

await mongoose.disconnect();
process.exit(0);
