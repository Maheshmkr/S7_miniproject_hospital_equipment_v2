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
import StockMovement from "../models/StockMovement.js";
import Calibration from "../models/Calibration.js";
import PreventiveMaintenance from "../models/PreventiveMaintenance.js";
import { asyncHandler, ok } from "../services/apiError.js";
import { assertDate } from "../services/validate.js";

/** Shared query-parameter parser: dateFrom, dateTo, departmentId, status, category, equipmentId, engineerId. */
function buildFilter(query, { dateField = "createdAt" } = {}) {
  const filter = {};
  const from = assertDate(query.dateFrom, "dateFrom");
  const to = assertDate(query.dateTo, "dateTo");
  if (from || to) {
    filter[dateField] = {};
    if (from) filter[dateField].$gte = from;
    if (to) filter[dateField].$lte = to;
  }
  if (query.status) filter.status = query.status;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.equipmentId) filter.equipmentId = query.equipmentId;
  if (query.engineerId) filter.engineerId = query.engineerId;
  if (query.category) filter.category = query.category;
  return filter;
}

const countBy = (Model, filter, field) =>
  Model.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

/* --------------------------------- Reports -------------------------------- */

export const equipmentReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const items = await Equipment.find(filter).populate("departmentId", "name code").sort({ equipmentId: 1 });
  return ok(res, { items, total: items.length, byStatus: await countBy(Equipment, filter, "status"), byCategory: await countBy(Equipment, filter, "category") });
});

export const complaintReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const items = await Complaint.find(filter).populate("equipmentId", "equipmentId name").sort({ createdAt: -1 });
  return ok(res, { items, total: items.length, byStatus: await countBy(Complaint, filter, "status"), byPriority: await countBy(Complaint, filter, "priority") });
});

export const maintenanceReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const items = await Maintenance.find(filter)
    .populate("equipmentId", "equipmentId name category")
    .populate("engineerId", "name")
    .sort({ createdAt: -1 });
  return ok(res, { items, total: items.length, byType: await countBy(Maintenance, filter, "maintenanceType"), byStatus: await countBy(Maintenance, filter, "status") });
});

export const departmentReport = asyncHandler(async (_req, res) => {
  const departments = await Department.find().lean();
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
  const filter = {};
  if (req.query.equipmentId) filter.equipmentId = req.query.equipmentId;
  const items = await Warranty.find(filter).populate("equipmentId", "equipmentId name");
  return ok(res, { items: items.map((w) => w.toJSON()), total: items.length });
});

export const auditReport = asyncHandler(async (req, res) => {
  const filter = {};
  const from = assertDate(req.query.dateFrom, "dateFrom");
  const to = assertDate(req.query.dateTo, "dateTo");
  if (from || to) filter.timestamp = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.query.module) filter.module = req.query.module;
  const items = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(1000);
  return ok(res, { items, total: items.length, byModule: await countBy(AuditLog, filter, "module") });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.departmentId) filter.departmentId = req.query.departmentId;

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
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;

  const items = await Vendor.find(filter).sort({ name: 1 });
  return ok(res, {
    items,
    total: items.length,
    byCategory: await countBy(Vendor, filter, "category"),
    byStatus: await countBy(Vendor, filter, "status"),
  });
});

export const purchaseOrderReport = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, { dateField: "orderDate" });
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
  const filter = buildFilter(req.query, { dateField: "calibrationDate" });
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
  const filter = buildFilter(req.query, { dateField: "scheduledDate" });
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

export const dashboardAnalytics = asyncHandler(async (_req, res) => {
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
    Equipment.countDocuments(),
    Equipment.countDocuments({ status: "OPERATIONAL" }),
    Equipment.countDocuments({ status: "UNDER_MAINTENANCE" }),
    Equipment.countDocuments({ status: "UNDER_BREAKDOWN" }),
    Complaint.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] } }),
    Complaint.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }),
    WorkOrder.countDocuments(),
    WorkOrder.countDocuments({ status: "COMPLETED" }),
    ServiceReport.countDocuments(),
    AuditInstance.countDocuments(),
    InventoryItem.countDocuments(),
    InventoryItem.countDocuments({ status: { $in: ["LOW_STOCK", "OUT_OF_STOCK"] } }),
    PurchaseOrder.countDocuments({ status: { $in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED"] } }),
  ]);

  const resolved = await Complaint.find({ resolvedAt: { $ne: null } }).select("createdAt resolvedAt").lean();
  const avgResolutionHours = resolved.length
    ? Math.round(
        resolved.reduce((sum, c) => sum + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3_600_000, 0) /
          resolved.length,
      )
    : 0;

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
  });
});

export const equipmentAnalytics = asyncHandler(async (_req, res) => {
  const byDepartment = await Equipment.aggregate([
    { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$department.name", count: 1 } },
    { $sort: { count: -1 } },
  ]);
  return ok(res, {
    byStatus: await countBy(Equipment, {}, "status"),
    byCategory: await countBy(Equipment, {}, "category"),
    byCriticality: await countBy(Equipment, {}, "criticality"),
    byDepartment,
    averageHealth: (await Equipment.aggregate([{ $group: { _id: null, avg: { $avg: "$healthScore" } } }]))[0]?.avg ?? 0,
  });
});

export const complaintAnalytics = asyncHandler(async (_req, res) =>
  ok(res, {
    byStatus: await countBy(Complaint, {}, "status"),
    byPriority: await countBy(Complaint, {}, "priority"),
    byDepartment: await countBy(Complaint, {}, "departmentId"),
  }),
);

export const maintenanceAnalytics = asyncHandler(async (_req, res) => {
  const engineerWorkload = await WorkOrder.aggregate([
    { $match: { status: { $nin: ["COMPLETED", "CANCELLED"] } } },
    { $group: { _id: "$engineerId", count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "engineer" } },
    { $unwind: { path: "$engineer", preserveNullAndEmptyArrays: true } },
    { $project: { name: "$engineer.name", count: 1 } },
    { $sort: { count: -1 } },
  ]);
  const durations = await Maintenance.find({ endTime: { $ne: null } }).select("startTime endTime").lean();
  const avgDurationMins = durations.length
    ? Math.round(durations.reduce((s, m) => s + (new Date(m.endTime) - new Date(m.startTime)) / 60000, 0) / durations.length)
    : 0;
  return ok(res, {
    byType: await countBy(Maintenance, {}, "maintenanceType"),
    byStatus: await countBy(Maintenance, {}, "status"),
    rootCauseDistribution: await countBy(Investigation, {}, "rootCauseCategory"),
    engineerWorkload,
    avgDurationMins,
  });
});

export const departmentAnalytics = asyncHandler(async (_req, res) => {
  const departments = await Department.find().lean();
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

export const warrantyAnalytics = asyncHandler(async (_req, res) => {
  const all = await Warranty.find().populate("equipmentId", "equipmentId name");
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

export const auditAnalytics = asyncHandler(async (_req, res) => {
  const total = await AuditInstance.countDocuments();
  const approved = await AuditInstance.countDocuments({ status: "APPROVED" });
  return ok(res, {
    total,
    approved,
    completionRate: total ? Math.round((approved / total) * 100) : 0,
    byStatus: await countBy(AuditInstance, {}, "status"),
    trailByModule: await countBy(AuditLog, {}, "module"),
  });
});

export const inventoryAnalytics = asyncHandler(async (_req, res) => {
  const [totalItems, lowStock, outOfStock, items] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryItem.countDocuments({ status: "LOW_STOCK" }),
    InventoryItem.countDocuments({ status: "OUT_OF_STOCK" }),
    InventoryItem.find().select("totalValue category departmentId expiryDate quantity").lean(),
  ]);

  const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);

  const byCategory = await InventoryItem.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: "$totalValue" } } },
    { $project: { category: "$_id", count: 1, totalValue: 1 } },
    { $sort: { totalValue: -1 } },
  ]);

  const byDepartment = await InventoryItem.aggregate([
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

export const vendorAnalytics = asyncHandler(async (_req, res) => {
  const [total, byCategory, byStatus] = await Promise.all([
    Vendor.countDocuments(),
    countBy(Vendor, {}, "category"),
    countBy(Vendor, {}, "status"),
  ]);

  const topVendorsByPO = await PurchaseOrder.aggregate([
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

export const purchaseOrderAnalytics = asyncHandler(async (_req, res) => {
  const [total, byStatus, byPriority] = await Promise.all([
    PurchaseOrder.countDocuments(),
    countBy(PurchaseOrder, {}, "status"),
    countBy(PurchaseOrder, {}, "priority"),
  ]);

  const spendByDepartment = await PurchaseOrder.aggregate([
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

/* --------------------------------- Exports -------------------------------- */

export const exportModuleCsv = asyncHandler(async (req, res) => {
  const { module } = req.params;

  let headers = [];
  let rows = [];

  if (module === "equipment") {
    const items = await Equipment.find().populate("departmentId", "name").lean();
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
    const items = await InventoryItem.find().populate("departmentId", "name").populate("vendorId", "name").lean();
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
    const items = await PurchaseOrder.find().populate("vendorId", "name").populate("departmentId", "name").lean();
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
    const items = await Vendor.find().lean();
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
    const items = await Maintenance.find().populate("equipmentId", "equipmentId name").populate("engineerId", "name").lean();
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
    const items = await Complaint.find().populate("equipmentId", "equipmentId name").lean();
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
