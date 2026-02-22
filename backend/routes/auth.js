import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as authController from "../controller/authController.js";

const router = Router();

// Public routes
router.post("/signup", authController.register);
router.post("/signin", authController.login);
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.use(authenticate);
router.get("/me", authController.getMe);

export default router;
