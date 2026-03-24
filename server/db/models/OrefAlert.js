import mongoose from "mongoose";

const orefAlertSchema = new mongoose.Schema({
  city: { type: String, required: true },
  title: { type: String, default: "" },
  desc: { type: String, default: "" },
  receivedAt: { type: Date, default: Date.now, index: true },
});

orefAlertSchema.index({ city: 1 }, { unique: true });

export const OrefAlert = mongoose.model("OrefAlert", orefAlertSchema);
