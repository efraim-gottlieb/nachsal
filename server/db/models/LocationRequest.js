import mongoose from "mongoose";

const locationRequestSchema = new mongoose.Schema({
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
  },
}, { timestamps: true });

export const LocationRequest = mongoose.model("LocationRequest", locationRequestSchema);
