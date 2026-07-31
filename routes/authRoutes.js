import express from "express";
import { register, verifyOtp, resendOtp, login } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);

export default router;
