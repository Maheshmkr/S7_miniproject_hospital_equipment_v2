import mongoose from "mongoose";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ServiceReport from "../models/ServiceReport.js";
import Warranty from "../models/Warranty.js";
import Department from "../models/Department.js";
import AuditLog from "../models/AuditLog.js";
import AuditInstance from "../models/AuditInstance.js";
import Investigation from "../models/Investigation.js";
import Vendor from "../models/Vendor.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import InventoryItem from "../models/InventoryItem.js";
import Calibration from "../models/Calibration.js";
import PreventiveMaintenance from "../models/PreventiveMaintenance.js";
import User from "../models/User.js";
import { ApiError, asyncHandler, ok } from "../services/apiError.js";
import { assertDate, findByAnyId } from "../services/validate.js";
import { calculateEquipmentEhs, getBulkEquipmentEhs } from "../services/ehsService.js";

/** Shared query-parameter parser: dateFrom, dateTo, departmentId, status, category, equipmentId, engineerId. */
function buildFilter(query, user, { dateField = "createdAt" } = {}) {
  const filter = {};
  
  // Date range filters
  const from = assertDate(query.dateFrom || query.from, "dateFrom");
  const to = assertDate(query.dateTo || query.to, "dateTo");
  if (from || to) {
    filter[dateField] = {};
    if (from) filter[dateField].$gte = from;
    if (to) filter[dateField].$lte = to;
  }
  
  // Enforce department filter for STAFF (RBAC requirement)
  if (user && user.role === "DEPARTMENT_STAFF") {
    if (user.departmentId) {
      filter.departmentId = new mongoose.Types.ObjectId(user.departmentId);
    }
  } else if (query.departmentId) {
    filter.departmentId = new mongoose.Types.ObjectId(query.departmentId);
  }
  
  // Engineer constraint for BMEs (RBAC requirement)
  if (user && user.role === "BIOMEDICAL_ENGINEER") {
    if (dateField === "scheduledDate") {
      filter.assignedEngineerId = new mongoose.Types.ObjectId(user._id);
    } else {
      filter.engineerId = new mongoose.Types.ObjectId(user._id);
    }
  } else if (query.engineerId) {
    if (dateField === "scheduledDate") {
      filter.assignedEngineerId = new mongoose.Types.ObjectId(query.engineerId);
    } else {
      filter.engineerId = new mongoose.Types.ObjectId(query.engineerId);
    }
  }

  // Other filters
  if (query.status) filter.status = query.status;
  if (query.equipmentId) filter.equipmentId = new mongoose.Types.ObjectId(query.equipmentId);
  if (query.category) filter.category = query.category;
  if (query.criticality) filter.criticality = query.criticality;
  if (query.priority) filter.priority = query.priority;
  if (query.maintenanceType) filter.maintenanceType = query.maintenanceType;
  
  return filter;
}

const countBy = async (Model, filter, field) =>
  Model.aggregate([
    { $match: filter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

/* --------------------------------- Reports -------------------------------- */

export const equipmentReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await Equipment.find(filter).populate("departmentId", "name code").sort({ equipmentId: 1 });
  return ok(res, { items, total: items.length, byStatus: await countBy(Equipment, filter, "status"), byCategory: await countBy(Equipment, filter, "category") });
});

export const complaintReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await Complaint.find(filter).populate("equipmentId", "equipmentId name").sort({ createdAt: -1 });
  return ok(res, { items, total: items.length, byStatus: await countBy(Complaint, filter, "status"), byPriority: await countBy(Complaint, filter, "priority") });
});

export const maintenanceReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await Maintenance.find(filter)
    .populate("equipmentId", "equipmentId name category")
    .populate("engineerId", "name")
    .sort({ createdAt: -1 });
  return ok(res, { items, total: items.length, byType: await countBy(Maintenance, filter, "maintenanceType"), byStatus: await countBy(Maintenance, filter, "status") });
});

export const departmentReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const departments = await Department.find(filter).lean();
  const rows = await Promise.all(
    departments.map(async (d) => ({
      department: d,
      equipment: await Equipment.countDocuments({ departmentId: d._id }),
      openComplaints: await Complaint.countDocuments({ departmentId: d._id, status: { $nin: ["RESOLVED", "CLOSED"] } }),
      workOrders: await WorkOrder.countDocuments({ departmentId: d._id }),
    })),
  );
  return ok(res, { items: rows, total: rows.length });
});

export const warrantyReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await Warranty.find(filter).populate("equipmentId", "equipmentId name");
  return ok(res, { items: items.map((w) => w.toJSON()), total: items.length });
});

export const auditReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const from = assertDate(req.query.dateFrom || req.query.from, "dateFrom");
  const to = assertDate(req.query.dateTo || req.query.to, "dateTo");
  const logFilter = {};
  if (from || to) logFilter.timestamp = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.query.module) logFilter.module = req.query.module;
  
  const items = await AuditLog.find(logFilter).sort({ timestamp: -1 }).limit(1000);
  return ok(res, { items, total: items.length, byModule: await countBy(AuditLog, logFilter, "module") });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await InventoryItem.find(filter)
    .populate("departmentId", "name code")
    .populate("vendorId", "name vendorId")
    .sort({ itemId: 1 });

  const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);

  return ok(res, {
    items,
    total: items.length,
    totalValue: Math.round(totalValue * 100) / 100,
    byCategory: await countBy(InventoryItem, filter, "category"),
    byStatus: await countBy(InventoryItem, filter, "status"),
  });
});

export const vendorReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const items = await Vendor.find(filter).sort({ name: 1 });
  return ok(res, {
    items,
    total: items.length,
    byCategory: await countBy(Vendor, filter, "category"),
    byStatus: await countBy(Vendor, filter, "status"),
  });
});

export const purchaseOrderReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "orderDate" });
  const items = await PurchaseOrder.find(filter)
    .populate("vendorId", "name vendorId")
    .populate("departmentId", "name code")
    .sort({ orderDate: -1 });

  const totalSpend = items.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

  return ok(res, {
    items,
    total: items.length,
    totalSpend: Math.round(totalSpend * 100) / 100,
    byStatus: await countBy(PurchaseOrder, filter, "status"),
    byPriority: await countBy(PurchaseOrder, filter, "priority"),
  });
});

export const calibrationReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "calibrationDate" });
  const items = await Calibration.find(filter)
    .populate("equipmentId", "equipmentId name category")
    .populate("performedBy", "name")
    .sort({ calibrationDate: -1 });

  return ok(res, {
    items,
    total: items.length,
    byStatus: await countBy(Calibration, filter, "status"),
    byResult: await countBy(Calibration, filter, "result"),
  });
});

export const preventiveReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "scheduledDate" });
  const items = await PreventiveMaintenance.find(filter)
    .populate("equipmentId", "equipmentId name category")
    .populate("assignedEngineerId", "name")
    .sort({ scheduledDate: -1 });

  return ok(res, {
    items,
    total: items.length,
    byStatus: await countBy(PreventiveMaintenance, filter, "status"),
  });
});

/* -------------------------------- Analytics ------------------------------- */

export const dashboardAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  
  const [
    totalEquipment,
    operational,
    underMaintenance,
    breakdown,
    openComplaints,
    resolvedComplaints,
    workOrders,
    completedWorkOrders,
    reports,
    audits,
    totalInventoryItems,
    lowStockItems,
    openPOs,
  ] = await Promise.all([
    Equipment.countDocuments(filter),
    Equipment.countDocuments({ ...filter, status: "OPERATIONAL" }),
    Equipment.countDocuments({ ...filter, status: "UNDER_MAINTENANCE" }),
    Equipment.countDocuments({ ...filter, status: "UNDER_BREAKDOWN" }),
    Complaint.countDocuments({ ...filter, status: { $nin: ["RESOLVED", "CLOSED"] } }),
    Complaint.countDocuments({ ...filter, status: { $in: ["RESOLVED", "CLOSED"] } }),
    WorkOrder.countDocuments(filter),
    WorkOrder.countDocuments({ ...filter, status: "COMPLETED" }),
    ServiceReport.countDocuments(),
    AuditInstance.countDocuments(),
    InventoryItem.countDocuments(filter),
    InventoryItem.countDocuments({ ...filter, status: { $in: ["LOW_STOCK", "OUT_OF_STOCK"] } }),
    PurchaseOrder.countDocuments({ ...filter, status: { $in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED"] } }),
  ]);

  const resolved = await Complaint.find({ ...filter, resolvedAt: { $ne: null } }).select("createdAt resolvedAt").lean();
  const avgResolutionHours = resolved.length
    ? Math.round(
        resolved.reduce((sum, c) => sum + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3_600_000, 0) /
          resolved.length,
      )
    : 0;

  // healthTrend: last 8 months averages & counts
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const healthTrend = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()];
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthFilter = { ...filter, createdAt: { $gte: start, $lte: end } };
    const incidents = await Complaint.countDocuments(monthFilter);
    
    const cumulativeFilter = { ...filter, createdAt: { $lte: end } };
    const healthAgg = await Equipment.aggregate([
      { $match: cumulativeFilter },
      { $group: { _id: null, avg: { $avg: "$healthScore" } } }
    ]);
    const healthVal = Math.round(healthAgg[0]?.avg ?? 95);
    
    const totalEq = await Equipment.countDocuments(cumulativeFilter);
    const operationalEq = await Equipment.countDocuments({ ...cumulativeFilter, status: "OPERATIONAL" });
    const uptimeVal = totalEq ? Math.round((operationalEq / totalEq) * 100) : 98;
    
    healthTrend.push({ month: monthName, health: healthVal, uptime: uptimeVal, incidents });
  }

  // costSplit: Maintenance cost distribution per equipment category
  const maintenanceCosts = await Maintenance.aggregate([
    { $match: filter },
    { $lookup: { from: "equipment", localField: "equipmentId", foreignField: "_id", as: "eq" } },
    { $unwind: { path: "$eq", preserveNullAndEmptyArrays: true } },
    { $group: { _id: "$eq.category", totalCost: { $sum: "$cost" } } }
  ]);
  const totalCostVal = maintenanceCosts.reduce((sum, c) => sum + (c.totalCost || 0), 0);
  const costSplit = maintenanceCosts.map(c => ({
    name: c._id || "Other",
    value: totalCostVal ? Math.round((c.totalCost / totalCostVal) * 100) : 0
  })).filter(c => c.value > 0);

  if (costSplit.length === 0) {
    costSplit.push(
      { name: "Imaging", value: 38 },
      { name: "Surgical", value: 24 },
      { name: "Critical Care", value: 20 },
      { name: "Other", value: 18 }
    );
  }

  // complaintFlow: last 7 days raised vs resolved velocity
  const complaintFlow = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 6; i >= 0; i--) {
    const targetDay = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dayName = days[targetDay.getDay() === 0 ? 6 : targetDay.getDay() - 1];
    const start = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
    const end = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 23, 59, 59, 999);
    
    const raised = await Complaint.countDocuments({ ...filter, createdAt: { $gte: start, $lte: end } });
    const resolvedCount = await Complaint.countDocuments({ ...filter, resolvedAt: { $gte: start, $lte: end } });
    complaintFlow.push({ day: dayName, raised, resolved: resolvedCount });
  }

  // departments list: score & counts
  const depts = await Department.find().lean();
  const departmentsList = await Promise.all(depts.map(async (d) => {
    const assets = await Equipment.countDocuments({ departmentId: d._id });
    const open = await Complaint.countDocuments({ departmentId: d._id, status: { $nin: ["RESOLVED", "CLOSED"] } });
    const completed = await WorkOrder.countDocuments({ departmentId: d._id, status: "COMPLETED" });
    const eqAgg = await Equipment.aggregate([
      { $match: { departmentId: d._id } },
      { $group: { _id: null, avg: { $avg: "$healthScore" } } }
    ]);
    const score = Math.round(eqAgg[0]?.avg ?? 95);
    return {
      name: d.name,
      assets,
      complaints: open,
      staff: 12,
      uptime: assets ? 99 : 100,
      score
    };
  }));

  // engineers list
  const engs = await User.find({ role: "BIOMEDICAL_ENGINEER" }).lean();
  const engineersList = await Promise.all(engs.map(async (e) => {
    const openWO = await WorkOrder.countDocuments({ engineerId: e._id, status: { $nin: ["COMPLETED", "CANCELLED"] } });
    const load = Math.min(100, openWO * 15);
    return {
      name: e.name,
      avatar: e.name.split(" ").map(n => n[0]).join(""),
      zone: e.title || "Biomedical Team",
      open: openWO,
      load
    };
  }));

  // categories list
  const categoriesList = await Promise.all([
    { name: "Imaging", color: "var(--chart-1)" },
    { name: "Life Support", color: "var(--chart-2)" },
    { name: "Surgical", color: "var(--chart-3)" },
    { name: "Diagnostics", color: "var(--chart-4)" },
    { name: "Monitoring", color: "var(--chart-5)" }
  ].map(async (c) => {
    const count = await Equipment.countDocuments({ ...filter, category: c.name });
    const healthAgg = await Equipment.aggregate([
      { $match: { ...filter, category: c.name } },
      { $group: { _id: null, avg: { $avg: "$healthScore" } } }
    ]);
    const health = Math.round(healthAgg[0]?.avg ?? 95);
    return { name: c.name, count, health, color: c.color };
  }));

  return ok(res, {
    totalEquipment,
    operational,
    underMaintenance,
    breakdown,
    openComplaints,
    resolvedComplaints,
    workOrders,
    completedWorkOrders,
    serviceReports: reports,
    audits,
    totalInventoryItems,
    lowStockItems,
    openPOs,
    maintenanceCompletionRate: workOrders ? Math.round((completedWorkOrders / workOrders) * 100) : 0,
    avgResolutionHours,
    healthTrend,
    costSplit,
    complaintFlow,
    departments: departmentsList,
    engineers: engineersList,
    categories: categoriesList
  });
});

export const equipmentAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const byDepartment = await Equipment.aggregate([
    { $match: filter },
    { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$department.name", count: 1 } },
    { $sort: { count: -1 } },
  ]);
  const healthAgg = await Equipment.aggregate([
    { $match: filter },
    { $group: { _id: null, avg: { $avg: "$healthScore" } } }
  ]);
  return ok(res, {
    byStatus: await countBy(Equipment, filter, "status"),
    byCategory: await countBy(Equipment, filter, "category"),
    byCriticality: await countBy(Equipment, filter, "criticality"),
    byDepartment,
    averageHealth: healthAgg[0]?.avg ?? 0,
  });
});

export const complaintAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const byDepartment = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
    { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$dept.name", count: 1 } }
  ]);
  return ok(res, {
    byStatus: await countBy(Complaint, filter, "status"),
    byPriority: await countBy(Complaint, filter, "priority"),
    byDepartment,
  });
});

export const maintenanceAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const engineerWorkload = await WorkOrder.aggregate([
    { $match: { ...filter, status: { $nin: ["COMPLETED", "CANCELLED"] } } },
    { $group: { _id: "$engineerId", count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "engineer" } },
    { $unwind: { path: "$engineer", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$engineer.name", count: 1 } },
    { $sort: { count: -1 } },
  ]);
  const durations = await Maintenance.find({ ...filter, endTime: { $ne: null } }).select("startTime endTime").lean();
  const avgDurationMins = durations.length
    ? Math.round(durations.reduce((s, m) => s + (new Date(m.endTime) - new Date(m.startTime)) / 60000, 0) / durations.length)
    : 0;
  return ok(res, {
    byType: await countBy(Maintenance, filter, "maintenanceType"),
    byStatus: await countBy(Maintenance, filter, "status"),
    rootCauseDistribution: await countBy(Investigation, {}, "rootCauseCategory"),
    engineerWorkload,
    avgDurationMins,
  });
});

export const departmentAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const departments = await Department.find(filter).lean();
  const rows = await Promise.all(
    departments.map(async (d) => ({
      name: d.name,
      equipment: await Equipment.countDocuments({ departmentId: d._id }),
      complaints: await Complaint.countDocuments({ departmentId: d._id }),
      openComplaints: await Complaint.countDocuments({ departmentId: d._id, status: { $nin: ["RESOLVED", "CLOSED"] } }),
      workOrders: await WorkOrder.countDocuments({ departmentId: d._id }),
    })),
  );
  return ok(res, rows);
});

export const warrantyAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const all = await Warranty.find(filter).populate("equipmentId", "equipmentId name");
  const rows = all.map((w) => ({ ...w.toJSON() }));
  return ok(res, {
    total: rows.length,
    warranties: rows.filter((r) => r.kind === "WARRANTY").length,
    amcs: rows.filter((r) => r.kind === "AMC").length,
    expiringIn60Days: rows.filter((r) => r.daysRemaining >= 0 && r.daysRemaining <= 60).length,
    expired: rows.filter((r) => r.daysRemaining < 0).length,
    items: rows,
  });
});

export const auditAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const total = await AuditInstance.countDocuments(filter);
  const approved = await AuditInstance.countDocuments({ ...filter, status: "APPROVED" });
  return ok(res, {
    total,
    approved,
    completionRate: total ? Math.round((approved / total) * 100) : 0,
    byStatus: await countBy(AuditInstance, filter, "status"),
    trailByModule: await countBy(AuditLog, {}, "module"),
  });
});

export const inventoryAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const [totalItems, lowStock, outOfStock, items] = await Promise.all([
    InventoryItem.countDocuments(filter),
    InventoryItem.countDocuments({ ...filter, status: "LOW_STOCK" }),
    InventoryItem.countDocuments({ ...filter, status: "OUT_OF_STOCK" }),
    InventoryItem.find(filter).select("totalValue category departmentId expiryDate quantity").lean(),
  ]);
  const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
  const byCategory = await InventoryItem.aggregate([
    { $match: filter },
    { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: "$totalValue" } } },
    { $project: { category: "$_id", count: 1, totalValue: 1 } },
    { $sort: { totalValue: -1 } },
  ]);
  const byDepartment = await InventoryItem.aggregate([
    { $match: filter },
    { $group: { _id: "$departmentId", count: { $sum: 1 }, totalValue: { $sum: "$totalValue" } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    { $project: { department: { $ifNull: ["$department.name", "General"] }, count: 1, totalValue: 1 } },
    { $sort: { totalValue: -1 } },
  ]);
  return ok(res, {
    totalItems,
    totalValue: Math.round(totalValue * 100) / 100,
    lowStock,
    outOfStock,
    byCategory,
    byDepartment,
  });
});

export const vendorAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const [total, byCategory, byStatus] = await Promise.all([
    Vendor.countDocuments(filter),
    countBy(Vendor, filter, "category"),
    countBy(Vendor, filter, "status"),
  ]);
  const topVendorsByPO = await PurchaseOrder.aggregate([
    { $match: filter },
    { $group: { _id: "$vendorId", count: { $sum: 1 }, totalSpend: { $sum: "$totalAmount" } } },
    { $lookup: { from: "vendors", localField: "_id", foreignField: "_id", as: "vendor" } },
    { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$vendor.name", count: 1, totalSpend: 1 } },
    { $sort: { totalSpend: -1 } },
    { $limit: 10 },
  ]);
  return ok(res, {
    total,
    byCategory,
    byStatus,
    topVendorsByPO,
  });
});

export const purchaseOrderAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "orderDate" });
  const [total, byStatus, byPriority] = await Promise.all([
    PurchaseOrder.countDocuments(filter),
    countBy(PurchaseOrder, filter, "status"),
    countBy(PurchaseOrder, filter, "priority"),
  ]);
  const spendByDepartment = await PurchaseOrder.aggregate([
    { $match: filter },
    { $group: { _id: "$departmentId", count: { $sum: 1 }, totalSpend: { $sum: "$totalAmount" } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    { $project: { department: "$department.name", count: 1, totalSpend: 1 } },
    { $sort: { totalSpend: -1 } },
  ]);
  return ok(res, {
    total,
    byStatus,
    byPriority,
    spendByDepartment,
  });
});

export const workOrderAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const [
    total,
    pending,
    inProgress,
    completed,
    overdue
  ] = await Promise.all([
    WorkOrder.countDocuments(filter),
    WorkOrder.countDocuments({ ...filter, status: "PENDING" }),
    WorkOrder.countDocuments({ ...filter, status: "IN_PROGRESS" }),
    WorkOrder.countDocuments({ ...filter, status: "COMPLETED" }),
    WorkOrder.countDocuments({ ...filter, status: { $ne: "COMPLETED" }, scheduledDate: { $lt: new Date() } }),
  ]);
  return ok(res, {
    total,
    pending,
    inProgress,
    completed,
    overdue,
    byPriority: await countBy(WorkOrder, filter, "priority"),
    byStatus: await countBy(WorkOrder, filter, "status")
  });
});

export const calibrationAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "calibrationDate" });
  const [
    total,
    passed,
    failed,
    overdue
  ] = await Promise.all([
    Calibration.countDocuments(filter),
    Calibration.countDocuments({ ...filter, result: "PASS" }),
    Calibration.countDocuments({ ...filter, result: "FAIL" }),
    Calibration.countDocuments({ ...filter, status: "OVERDUE" }),
  ]);
  return ok(res, {
    total,
    passed,
    failed,
    overdue,
    complianceRate: total ? Math.round((passed / total) * 100) : 100,
    byStatus: await countBy(Calibration, filter, "status"),
    byResult: await countBy(Calibration, filter, "result"),
  });
});

export const preventiveAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user, { dateField: "scheduledDate" });
  const [
    total,
    completed,
    upcoming,
    overdue
  ] = await Promise.all([
    PreventiveMaintenance.countDocuments(filter),
    PreventiveMaintenance.countDocuments({ ...filter, status: "COMPLETED" }),
    PreventiveMaintenance.countDocuments({ ...filter, status: "SCHEDULED" }),
    PreventiveMaintenance.countDocuments({ ...filter, status: "OVERDUE" }),
  ]);
  return ok(res, {
    total,
    completed,
    upcoming,
    overdue,
    complianceRate: total ? Math.round((completed / total) * 100) : 100,
    byStatus: await countBy(PreventiveMaintenance, filter, "status"),
  });
});

export const trendsAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()] + " " + d.getFullYear();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthFilter = { ...filter, createdAt: { $gte: start, $lte: end } };
    const complaintsCount = await Complaint.countDocuments(monthFilter);
    const workOrdersCount = await WorkOrder.countDocuments(monthFilter);
    trend.push({
      period: monthName,
      complaints: complaintsCount,
      workOrders: workOrdersCount
    });
  }
  return ok(res, trend);
});

export const distributionsAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  return ok(res, {
    equipmentStatus: await countBy(Equipment, filter, "status"),
    equipmentCategory: await countBy(Equipment, filter, "category"),
    equipmentCriticality: await countBy(Equipment, filter, "criticality"),
  });
});

export const comparativePerformance = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const depts = await Department.find().lean();
  const comparison = await Promise.all(depts.map(async (d) => {
    const currentFilter = { ...filter, departmentId: d._id };
    const complaintsCount = await Complaint.countDocuments(currentFilter);
    const workOrdersCount = await WorkOrder.countDocuments(currentFilter);
    return {
      name: d.name,
      complaints: complaintsCount,
      workOrders: workOrdersCount
    };
  }));
  return ok(res, comparison);
});

export const costsAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const eqCost = await Equipment.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$cost" } } }
  ]);
  const maintCost = await Maintenance.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$cost" } } }
  ]);
  const poCost = await PurchaseOrder.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);
  return ok(res, {
    equipmentPurchaseCost: eqCost[0]?.total || 0,
    maintenanceCost: maintCost[0]?.total || 0,
    purchaseOrderCost: poCost[0]?.total || 0,
    totalCost: (eqCost[0]?.total || 0) + (maintCost[0]?.total || 0) + (poCost[0]?.total || 0)
  });
});

export const complianceAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const [pmTotal, pmCompleted, calTotal, calPassed] = await Promise.all([
    PreventiveMaintenance.countDocuments(filter),
    PreventiveMaintenance.countDocuments({ ...filter, status: "COMPLETED" }),
    Calibration.countDocuments(filter),
    Calibration.countDocuments({ ...filter, result: "PASS" })
  ]);
  const ppmCompliance = pmTotal ? Math.round((pmCompleted / pmTotal) * 100) : 100;
  const calibrationCompliance = calTotal ? Math.round((calPassed / calTotal) * 100) : 100;
  return ok(res, {
    ppmCompliance,
    calibrationCompliance,
    overallCompliance: Math.round((ppmCompliance + calibrationCompliance) / 2)
  });
});

export const availabilityAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const total = await Equipment.countDocuments(filter);
  const operational = await Equipment.countDocuments({ ...filter, status: "OPERATIONAL" });
  return ok(res, {
    overall: total ? Math.round((operational / total) * 100) : 100,
    operational,
    total
  });
});

export const breakdownsAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const [
    breakdownCount,
    durations
  ] = await Promise.all([
    Complaint.countDocuments({ ...filter, priority: "CRITICAL" }),
    Maintenance.find({ ...filter, maintenanceType: "BREAKDOWN", endTime: { $ne: null } })
      .select("startTime endTime")
      .lean()
  ]);
  const mttrMinutes = durations.length
    ? Math.round(durations.reduce((s, m) => s + (new Date(m.endTime) - new Date(m.startTime)) / 60000, 0) / durations.length)
    : 0;
  return ok(res, {
    count: breakdownCount,
    mttrHours: Math.round((mttrMinutes / 60) * 10) / 10,
    mttrMinutes
  });
});

export const exportModuleCsv = asyncHandler(async (req, res) => {
  const { module } = req.params;
  let headers = [];
  let rows = [];
  const filter = {};
  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) {
    filter.departmentId = new mongoose.Types.ObjectId(req.user.departmentId);
  }
  if (module === "equipment") {
    const items = await Equipment.find(filter).populate("departmentId", "name").lean();
    headers = ["Equipment ID", "Name", "Category", "Model", "Serial", "Department", "Status", "Health Score", "Cost"];
    rows = items.map((i) => [
      i.equipmentId,
      i.name,
      i.category,
      i.model || "",
      i.serialNumber || "",
      i.departmentId?.name || "",
      i.status,
      String(i.healthScore ?? 100),
      i.cost || "",
    ]);
  } else if (module === "inventory") {
    const items = await InventoryItem.find(filter).populate("departmentId", "name").populate("vendorId", "name").lean();
    headers = ["Item ID", "SKU", "Name", "Category", "Quantity", "Available", "Unit", "Unit Cost", "Total Value", "Status", "Location"];
    rows = items.map((i) => [
      i.itemId,
      i.sku || "",
      i.name,
      i.category,
      String(i.quantity),
      String(i.availableQuantity),
      i.unit || "PIECE",
      String(i.unitCost || 0),
      String(i.totalValue || 0),
      i.status,
      i.storageLocation || "",
    ]);
  } else if (module === "purchase-orders") {
    const items = await PurchaseOrder.find(filter).populate("vendorId", "name").populate("departmentId", "name").lean();
    headers = ["PO Number", "Vendor", "Department", "Title", "Status", "Priority", "Total Amount", "Currency", "Order Date"];
    rows = items.map((i) => [
      i.poNumber || i.purchaseOrderId,
      i.vendorId?.name || "",
      i.departmentId?.name || "",
      i.title || "",
      i.status,
      i.priority,
      String(i.totalAmount || 0),
      i.currency || "USD",
      i.orderDate ? new Date(i.orderDate).toISOString().slice(0, 10) : "",
    ]);
  } else if (module === "vendors") {
    const items = await Vendor.find(filter).lean();
    headers = ["Vendor ID", "Name", "Category", "Status", "Contact Person", "Email", "Phone", "Rating"];
    rows = items.map((i) => [
      i.vendorId,
      i.name,
      i.category,
      i.status,
      i.contactPerson || "",
      i.email || "",
      i.phone || "",
      String(i.rating ?? 0),
    ]);
  } else if (module === "maintenance") {
    const items = await Maintenance.find(filter).populate("equipmentId", "equipmentId name").populate("engineerId", "name").lean();
    headers = ["Maintenance ID", "Equipment ID", "Equipment Name", "Type", "Status", "Engineer", "Cost", "Start Time", "End Time"];
    rows = items.map((i) => [
      i.maintenanceId || String(i._id),
      i.equipmentId?.equipmentId || "",
      i.equipmentId?.name || "",
      i.maintenanceType,
      i.status,
      i.engineerId?.name || "",
      String(i.cost || 0),
      i.startTime ? new Date(i.startTime).toISOString() : "",
      i.endTime ? new Date(i.endTime).toISOString() : "",
    ]);
  } else if (module === "complaints") {
    const items = await Complaint.find(filter).populate("equipmentId", "equipmentId name").lean();
    headers = ["Complaint ID", "Equipment ID", "Equipment Name", "Description", "Priority", "Status", "Created At"];
    rows = items.map((i) => [
      i.complaintId,
      i.equipmentId?.equipmentId || "",
      i.equipmentId?.name || "",
      i.description || "",
      i.priority,
      i.status,
      i.createdAt ? new Date(i.createdAt).toISOString() : "",
    ]);
  } else {
    const items = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean();
    headers = ["Timestamp", "User", "Action", "Module", "Record ID", "Description"];
    rows = items.map((i) => [
      i.timestamp ? new Date(i.timestamp).toISOString() : "",
      i.userName || "",
      i.action,
      i.module,
      i.recordId || "",
      i.description || "",
    ]);
  }
  const csv = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${module}_export_${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csv);
});

export const equipmentEhsAnalytics = asyncHandler(async (req, res) => {
  const eq = await findByAnyId(Equipment, req.params.equipmentId, "equipmentId");
  if (!eq) throw new ApiError(404, "Equipment not found");
  const data = await calculateEquipmentEhs(eq);
  if (!data) throw new ApiError(404, "Health score could not be calculated");
  return ok(res, data);
});

export const allEquipmentEhsAnalytics = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, req.user);
  const equipmentList = await Equipment.find(filter).lean();
  const data = await getBulkEquipmentEhs(equipmentList);
  return ok(res, { items: data, total: data.length });
});

