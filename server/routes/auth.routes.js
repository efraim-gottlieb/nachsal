import { Router } from "express";
import * as authControllers from "../controllers/auth.controller.js";
import auth from "../middlewares/auth.middleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/register", asyncHandler(authControllers.register));
router.post("/login", asyncHandler(authControllers.login));
router.get("/me", auth, asyncHandler(authControllers.getMe));

export default router;
