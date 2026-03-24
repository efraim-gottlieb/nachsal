import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  cities: [{ type: String, required: true }],
  status: {
    type: String,
    enum: ["active", "ended"],
    default: "active",
  },
  oref_alert: { type: Boolean, default: false },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  ended_at: { type: Date, default: null },
}, { timestamps: true });

export const Event = mongoose.model("Event", eventSchema);
