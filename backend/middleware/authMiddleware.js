import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../services/apiError.js";

export function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: user._id.toString(), role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "Authentication required");

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, "Invalid or expired session");
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, "Account no longer exists");
    if (user.status !== "ACTIVE") throw new ApiError(403, "Account is not active");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
