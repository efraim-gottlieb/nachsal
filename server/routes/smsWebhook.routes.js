import { Router } from "express";
import * as smsWebhookControllers from "../controllers/smsWebhook.controller.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/incoming", asyncHandler(smsWebhookControllers.handleIncomingSms));

export default router;
