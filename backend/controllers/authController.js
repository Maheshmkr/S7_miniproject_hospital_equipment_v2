import User from "../models/User.js";
import { signToken } from "../middleware/authMiddleware.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertEmail, assertEnum, requireFields } from "../services/validate.js";
import { ROLES } from "../models/User.js";
import { logAudit } from "../services/auditService.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, departmentId, employeeId, phone, title } = req.body;
  requireFields(req.body, ["name", "email", "password", "role"]);
  assertEmail(email);
  assertEnum(role, ROLES, "role");
  if (String(password).length < 8) throw new ApiError(400, "Password must be at least 8 characters");

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({
    name,
    email,
    passwordHash: await User.hashPassword(password),
    role,
    departmentId: departmentId || undefined,
    employeeId,
    phone,
    title,
    initials: String(name)
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  });

  await logAudit({ user, action: "USER_REGISTERED", module: "Auth", recordId: user._id, description: `${user.email} registered` });
  return created(res, { user: user.toJSON(), token: signToken(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  requireFields(req.body, ["email", "password"]);

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status !== "ACTIVE") throw new ApiError(403, "Account is not active");

  await logAudit({ user, action: "LOGIN", module: "Auth", recordId: user._id, description: `${user.email} signed in` });
  return ok(res, { user: user.toJSON(), token: signToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("departmentId", "name code");
  return ok(res, { user: user.toJSON() });
});

export const logout = asyncHandler(async (req, res) => {
  await logAudit({ user: req.user, action: "LOGOUT", module: "Auth", recordId: req.user._id, description: `${req.user.email} signed out` });
  return ok(res, null, "Signed out");
});
