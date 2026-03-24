import { Router } from "express";
import * as statusControllers from "../controllers/soldierStatus.controller.js";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/respond", auth, asyncHandler(statusControllers.respondToEvent));
router.get("/pending", auth, asyncHandler(statusControllers.getMyPendingSurveys));

export default router;
