import { Router } from "express";
import * as eventControllers from "../controllers/event.controller.js";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/", auth, asyncHandler(eventControllers.triggerEvent));
router.get("/", auth, asyncHandler(eventControllers.listAllEvents));
router.get("/active", auth, asyncHandler(eventControllers.listActiveEvents));
router.get("/:id", auth, asyncHandler(eventControllers.getEvent));
router.get("/:id/statuses", auth, asyncHandler(eventControllers.getEventStatuses));
router.put("/:id/end", auth, asyncHandler(eventControllers.closeEvent));

export default router;
