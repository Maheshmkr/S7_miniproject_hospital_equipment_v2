import Department from "../models/Department.js";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import User from "../models/User.js";
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
  const items = await Department.find(filter).sort({ name: 1 });
  return ok(res, items);
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

