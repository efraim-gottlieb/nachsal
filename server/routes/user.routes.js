import { Router } from "express";
import * as userControllers from "../controllers/user.controller.js";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.put("/location", auth, asyncHandler(userControllers.updateLocation));
router.put("/phone", auth, asyncHandler(userControllers.updatePhone));
router.get("/soldiers", auth, asyncHandler(userControllers.listAllSoldiers));
router.get("/my-soldiers", auth, asyncHandler(userControllers.getMySoldiers));
router.get("/soldier-cities", auth, asyncHandler(userControllers.listSoldierCities));
router.get("/:id", auth, asyncHandler(userControllers.getSoldier));

export default router;
