import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";
import { successResponse, errorResponse } from "../utils/response.js";

const JWT_SECRET = process.env.JWT_SECRET;
const RESET_TOKEN_EXPIRY = "15m";

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function toUserResponse(user) {
  const u = user.toJSON ? user.toJSON() : user;
  const { password_hash, ...rest } = u;
  return rest;
}

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 */
export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return errorResponse(res, "Email, password and name are required.", 400);
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return errorResponse(res, "Email already registered.", 409);
    }

    const user = await User.createUser({ email, password, name });
    await UserPreference.upsertPreference(user.id, {});

    const token = generateToken(user);

    return successResponse(
      res,
      { token, user: toUserResponse(user) },
      "Registration successful.",
      201,
    );
  } catch (err) {
    console.error("Register error:", err);
    return errorResponse(res, "Registration failed.", 500);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email and password are required.", 400);
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    const valid = await User.verifyPassword(password, user.password_hash);
    if (!valid) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    const token = generateToken(user);

    return successResponse(
      res,
      { token, user: toUserResponse(user) },
      "Login successful.",
    );
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse(res, "Login failed.", 500);
  }
}

/**
 * POST /api/auth/request-password-reset
 * Body: { email }
 */
export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required.", 400);
    }

    const user = await User.findByEmail(email);

    if (!user) {
      return successResponse(
        res,
        null,
        "If this email is registered, a reset link has been sent.",
      );
    }

    const resetToken = jwt.sign(
      { id: user.id, type: "password_reset" },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRY },
    );

    // TODO: integrate email service (e.g. nodemailer) to send resetToken via email
    // await sendResetEmail(user.email, resetToken);
    console.log(`[Password Reset] Token for ${user.email}: ${resetToken}`);

    return successResponse(
      res,
      null,
      "If this email is registered, a reset link has been sent.",
    );
  } catch (err) {
    console.error("RequestPasswordReset error:", err);
    return errorResponse(res, "Failed to process reset request.", 500);
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return errorResponse(res, "Token and new password are required.", 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(res, "Password must be at least 8 characters.", 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return errorResponse(res, "Reset token has expired.", 400);
      }
      return errorResponse(res, "Invalid reset token.", 400);
    }

    if (decoded.type !== "password_reset") {
      return errorResponse(res, "Invalid reset token.", 400);
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return errorResponse(res, "User not found.", 404);
    }

    await User.updatePassword(user.id, newPassword);

    return successResponse(res, null, "Password has been reset successfully.");
  } catch (err) {
    console.error("ResetPassword error:", err);
    return errorResponse(res, "Failed to reset password.", 500);
  }
}

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <token>
 */
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, "User not found.", 404);
    }

    return successResponse(
      res,
      toUserResponse(user),
      "User retrieved successfully.",
    );
  } catch (err) {
    console.error("GetMe error:", err);
    return errorResponse(res, "Failed to get user.", 500);
  }
}
