import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  user_type: {
    type: String,
    enum: ["soldier", "commander", "admin"],
    default: "soldier",
  },
  city: { type: String, default: "" },
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  commander_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  sms_alerts: { type: Boolean, default: false },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
