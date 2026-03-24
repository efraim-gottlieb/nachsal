import { Router } from "express";
import * as userControllers from "../controllers/user.controller.js";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.put("/location", auth, asyncHandler(userControllers.updateLocation));
router.put("/phone", auth, asyncHandler(userControllers.updatePhone));
router.post("/soldiers", auth, asyncHandler(userControllers.createSoldier));
router.get("/soldiers", auth, asyncHandler(userControllers.listAllSoldiers));
router.get("/my-soldiers", auth, asyncHandler(userControllers.getMySoldiers));
router.get("/soldier-cities", auth, asyncHandler(userControllers.listSoldierCities));
router.get("/commanders", auth, asyncHandler(userControllers.listAllCommanders));
router.post("/commanders", auth, asyncHandler(userControllers.createCommander));
router.put("/commanders/:id", auth, asyncHandler(userControllers.updateCommander));
router.delete("/commanders/:id", auth, asyncHandler(userControllers.deleteCommander));
router.put("/commanders/:id/sms", auth, asyncHandler(userControllers.toggleSmsAlerts));
router.get("/:id", auth, asyncHandler(userControllers.getSoldier));
router.put("/:id", auth, asyncHandler(userControllers.updateSoldier));
router.delete("/:id", auth, asyncHandler(userControllers.deleteSoldier));

export default router;
