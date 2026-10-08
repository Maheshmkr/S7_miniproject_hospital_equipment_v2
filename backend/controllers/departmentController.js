import mongoose from "mongoose";
import Department from "../models/Department.js";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import User, { ROLES } from "../models/User.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { findByAnyId, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";

const load = async (id) => {
  const dept = await findByAnyId(Department, id, "code");
  if (!dept) throw new ApiError(404, "Department not found");
  return dept;
};

export const listDepartments = asyncHandler(async (req, res) => {
  const { search, active } = req.query;
  const filter = {};
  if (active !== undefined) filter.active = active === "true" || active === true;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { code: new RegExp(search, "i") },
      { building: new RegExp(search, "i") },
      { headName: new RegExp(search, "i") },
    ];
  }
  const items = await Department.find(filter).sort({ name: 1 }).lean();
  const [counts, userCounts] = await Promise.all([
    Equipment.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  const userCountMap = Object.fromEntries(userCounts.map((c) => [String(c._id), c.count]));
  const withCounts = items.map((d) => ({
    ...d,
    equipmentCount: countMap[String(d._id)] || 0,
    assetsCount: countMap[String(d._id)] || 0,
    staffCount: userCountMap[String(d._id)] || 0,
  }));
  return ok(res, withCounts);
});

export const getDepartment = asyncHandler(async (req, res) => ok(res, await load(req.params.id)));

export const createDepartment = asyncHandler(async (req, res) => {
  requireFields(req.body, ["code", "name"]);
  const code = String(req.body.code).trim().toUpperCase();
  const existing = await Department.findOne({ code });
  if (existing) throw new ApiError(409, `Department code ${code} is already in use`);

  const dept = await Department.create({ ...req.body, code });
  await logAudit({
    user: req.user,
    action: "DEPARTMENT_CREATED",
    module: "Department",
    recordId: dept.code,
    description: `Created department ${dept.name} (${dept.code})`,
  });
  return created(res, dept);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  if (req.body.code && String(req.body.code).trim().toUpperCase() !== dept.code) {
    const newCode = String(req.body.code).trim().toUpperCase();
    const existing = await Department.findOne({ code: newCode, _id: { $ne: dept._id } });
    if (existing) throw new ApiError(409, `Department code ${newCode} is already in use`);
    req.body.code = newCode;
  }
  Object.assign(dept, req.body);
  await dept.save();
  await logAudit({
    user: req.user,
    action: "DEPARTMENT_UPDATED",
    module: "Department",
    recordId: dept.code,
    description: `Updated department ${dept.name} (${dept.code})`,
  });
  return ok(res, dept);
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const [equipmentCount, userCount] = await Promise.all([
    Equipment.countDocuments({ departmentId: dept._id }),
    User.countDocuments({ departmentId: dept._id }),
  ]);
  if (equipmentCount > 0) throw new ApiError(409, "Department still has equipment assigned");
  if (userCount > 0) throw new ApiError(409, "Department still has users assigned");

  await dept.deleteOne();
  await logAudit({
    user: req.user,
    action: "DEPARTMENT_DELETED",
    module: "Department",
    recordId: dept.code,
    description: `Deleted department ${dept.name} (${dept.code})`,
  });
  return ok(res, null, "Department deleted");
});

export const departmentStaff = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const staff = await User.find({ departmentId: dept._id })
    .select("-passwordHash")
    .sort({ name: 1 });
  return ok(res, staff);
});

export const departmentEquipment = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  return ok(res, await Equipment.find({ departmentId: dept._id }).sort({ equipmentId: 1 }));
});

export const departmentComplaints = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  return ok(
    res,
    await Complaint.find({ departmentId: dept._id })
      .populate("equipmentId", "equipmentId name")
      .sort({ createdAt: -1 }),
  );
});

export const departmentMaintenance = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  return ok(
    res,
    await WorkOrder.find({ departmentId: dept._id })
      .populate("equipmentId", "equipmentId name")
      .populate("engineerId", "name")
      .sort({ createdAt: -1 }),
  );
});

export const mapDepartmentEquipment = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const { equipmentIds } = req.body;
  const rawIds = Array.isArray(equipmentIds)
    ? equipmentIds
    : [req.body.equipmentId || equipmentIds].filter(Boolean);
  if (!rawIds.length) throw new ApiError(400, "equipmentIds is required");

  const objectIds = rawIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const stringIds = rawIds.map((id) => String(id).trim());

  const result = await Equipment.updateMany(
    {
      $or: [
        { _id: { $in: objectIds } },
        { equipmentId: { $in: stringIds } },
      ],
    },
    { $set: { departmentId: dept._id } },
  );

  await logAudit({
    user: req.user,
    action: "EQUIPMENT_MAPPED_TO_DEPARTMENT",
    module: "Department",
    recordId: dept.code,
    description: `Mapped ${result.modifiedCount} equipment asset(s) to ${dept.name} (${dept.code})`,
  });

  const updatedEquipment = await Equipment.find({ departmentId: dept._id }).sort({ equipmentId: 1 });
  return ok(res, updatedEquipment, `Equipment mapped to ${dept.name}`);
});

export const unmapDepartmentEquipment = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const { equipmentIds } = req.body;
  const rawIds = Array.isArray(equipmentIds)
    ? equipmentIds
    : [req.body.equipmentId || equipmentIds].filter(Boolean);
  if (!rawIds.length) throw new ApiError(400, "equipmentIds is required");

  const objectIds = rawIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const stringIds = rawIds.map((id) => String(id).trim());

  await Equipment.updateMany(
    {
      departmentId: dept._id,
      $or: [
        { _id: { $in: objectIds } },
        { equipmentId: { $in: stringIds } },
      ],
    },
    { $set: { departmentId: null } },
  );

  await logAudit({
    user: req.user,
    action: "EQUIPMENT_UNMAPPED_FROM_DEPARTMENT",
    module: "Department",
    recordId: dept.code,
    description: `Unmapped equipment asset(s) from ${dept.name} (${dept.code})`,
  });

  const updatedEquipment = await Equipment.find({ departmentId: dept._id }).sort({ equipmentId: 1 });
  return ok(res, updatedEquipment, `Equipment unmapped from ${dept.name}`);
});

export const mapDepartmentStaff = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const { userIds, role } = req.body;
  const rawIds = Array.isArray(userIds)
    ? userIds
    : [req.body.userId || userIds].filter(Boolean);
  if (!rawIds.length) throw new ApiError(400, "userIds is required");

  const objectIds = rawIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const stringIds = rawIds.map((id) => String(id).trim().toLowerCase());

  const updateFields = { departmentId: dept._id };
  if (role && ROLES.includes(role)) {
    updateFields.role = role;
  }

  const result = await User.updateMany(
    {
      $or: [
        { _id: { $in: objectIds } },
        { email: { $in: stringIds } },
      ],
    },
    { $set: updateFields },
  );

  await logAudit({
    user: req.user,
    action: "STAFF_MAPPED_TO_DEPARTMENT",
    module: "Department",
    recordId: dept.code,
    description: `Assigned ${result.modifiedCount} user(s) to ${dept.name} (${dept.code})`,
  });

  const updatedStaff = await User.find({ departmentId: dept._id })
    .select("-passwordHash")
    .sort({ name: 1 });
  return ok(res, updatedStaff, `Users assigned to ${dept.name}`);
});

export const unmapDepartmentStaff = asyncHandler(async (req, res) => {
  const dept = await load(req.params.id);
  const { userIds } = req.body;
  const rawIds = Array.isArray(userIds)
    ? userIds
    : [req.body.userId || userIds].filter(Boolean);
  if (!rawIds.length) throw new ApiError(400, "userIds is required");

  const objectIds = rawIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const stringIds = rawIds.map((id) => String(id).trim().toLowerCase());

  await User.updateMany(
    {
      departmentId: dept._id,
      $or: [
        { _id: { $in: objectIds } },
        { email: { $in: stringIds } },
      ],
    },
    { $set: { departmentId: null } },
  );

  await logAudit({
    user: req.user,
    action: "STAFF_UNMAPPED_FROM_DEPARTMENT",
    module: "Department",
    recordId: dept.code,
    description: `Unassigned user(s) from ${dept.name} (${dept.code})`,
  });

  const updatedStaff = await User.find({ departmentId: dept._id })
    .select("-passwordHash")
    .sort({ name: 1 });
  return ok(res, updatedStaff, `Users unassigned from ${dept.name}`);
});

