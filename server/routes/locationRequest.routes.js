import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import * as locationRequestController from "../controllers/locationRequest.controller.js";

const router = Router();

router.post("/", auth, asyncHandler(locationRequestController.sendLocationRequest));
router.get("/latest", auth, asyncHandler(locationRequestController.getLatestRequest));
router.get("/", auth, asyncHandler(locationRequestController.listAllRequests));
router.get("/:id/statuses", auth, asyncHandler(locationRequestController.getRequestStatuses));
router.put("/:id/close", auth, asyncHandler(locationRequestController.closeRequest));

export default router;
