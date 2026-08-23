import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import Department from "../models/Department.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertEmail, assertEnum, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";

const loadUser = async (id) => {
  let user = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    user = await User.findById(id).populate("departmentId", "name code");
  }
  if (!user) {
    user = await User.findOne({
      $or: [{ email: String(id).toLowerCase() }, { employeeId: id }],
    }).populate("departmentId", "name code");
  }
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

const resolveDepartmentId = async (deptRef) => {
  if (!deptRef) return undefined;
  if (mongoose.Types.ObjectId.isValid(deptRef)) return deptRef;
  const dept = await Department.findOne({
    $or: [{ code: deptRef }, { name: new RegExp(`^${deptRef}$`, "i") }],
  });
  return dept ? dept._id : undefined;
};

export const listUsers = asyncHandler(async (req, res) => {
  const { search, role, status, departmentId } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (departmentId) {
    const resolvedDeptId = await resolveDepartmentId(departmentId);
    filter.departmentId = resolvedDeptId || departmentId;
  }
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { employeeId: new RegExp(search, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  return ok(res, user);
});

export const createUser = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name", "email", "password", "role"]);
  assertEmail(req.body.email);
  assertEnum(req.body.role, ROLES, "role");
  if (String(req.body.password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const exists = await User.findOne({ email: String(req.body.email).toLowerCase() });
  if (exists) throw new ApiError(409, "An account with this email already exists");

  const { password, departmentId, initials, ...rest } = req.body;
  const resolvedDept = await resolveDepartmentId(departmentId);

  const computedInitials =
    initials ||
    String(req.body.name)
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const user = await User.create({
    ...rest,
    initials: computedInitials,
    departmentId: resolvedDept,
    passwordHash: await User.hashPassword(password),
  });

  const populated = await User.findById(user._id).populate("departmentId", "name code");

  await logAudit({
    user: req.user,
    action: "USER_CREATED",
    module: "User",
    recordId: user._id,
    description: `Created user ${user.email} (${user.role})`,
  });

  return created(res, populated);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, passwordHash, departmentId, initials, ...updates } = req.body;
  if (updates.role) assertEnum(updates.role, ROLES, "role");
  if (updates.email) {
    assertEmail(updates.email);
    const existing = await User.findOne({
      email: String(updates.email).toLowerCase(),
      _id: { $ne: req.params.id },
    });
    if (existing) throw new ApiError(409, "Email is already taken by another account");
  }

  const user = await loadUser(req.params.id);
  Object.assign(user, updates);

  if (departmentId !== undefined) {
    user.departmentId = await resolveDepartmentId(departmentId);
  }

  if (updates.name && !initials && !user.initials) {
    user.initials = String(updates.name)
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  } else if (initials) {
    user.initials = initials;
  }

  if (password && String(password).trim().length > 0) {
    if (String(password).length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }
    user.passwordHash = await User.hashPassword(password);
  }

  await user.save();
  const populated = await User.findById(user._id).populate("departmentId", "name code");

  await logAudit({
    user: req.user,
    action: "USER_UPDATED",
    module: "User",
    recordId: user._id,
    description: `Updated user ${user.email}`,
  });

  return ok(res, populated);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  assertEnum(req.body.status, ["ACTIVE", "INACTIVE", "SUSPENDED"], "status");
  const user = await loadUser(req.params.id);
  const previous = user.status;
  user.status = req.body.status;
  await user.save();

  await logAudit({
    user: req.user,
    action: "USER_STATUS_CHANGED",
    module: "User",
    recordId: user._id,
    previousStatus: previous,
    newStatus: user.status,
    description: `${user.email} status ${previous} → ${user.status}`,
  });

  return ok(res, user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  if (String(req.user._id) === String(user._id)) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  // Preserve referential integrity
  const [complaintsCount, woCount] = await Promise.all([
    Complaint.countDocuments({
      $or: [{ reportedBy: user._id }, { assignedEngineerId: user._id }],
    }),
    WorkOrder.countDocuments({
      $or: [{ engineerId: user._id }, { createdBy: user._id }],
    }),
  ]);

  if (complaintsCount > 0 || woCount > 0) {
    user.status = "INACTIVE";
    await user.save();
    await logAudit({
      user: req.user,
      action: "USER_STATUS_CHANGED",
      module: "User",
      recordId: user._id,
      description: `Deactivated user ${user.email} due to linked operational records`,
    });
    return ok(res, user, "User has linked operational records; account deactivated rather than deleted");
  }

  await User.findByIdAndDelete(user._id);
  await logAudit({
    user: req.user,
    action: "USER_DELETED",
    module: "User",
    recordId: user._id,
    description: `Deleted user ${user.email}`,
  });

  return ok(res, null, "User deleted");
});
