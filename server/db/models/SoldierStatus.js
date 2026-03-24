import mongoose from "mongoose";

const soldierStatusSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "ok", "not_ok", "no_response"],
    default: "pending",
  },
  responded_at: { type: Date, default: null },
}, { timestamps: true });

soldierStatusSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

export const SoldierStatus = mongoose.model("SoldierStatus", soldierStatusSchema);
