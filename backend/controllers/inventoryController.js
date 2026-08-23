import InventoryItem, { INVENTORY_CATEGORIES, INVENTORY_STATUSES } from "../models/InventoryItem.js";
import StockMovement, { MOVEMENT_TYPES } from "../models/StockMovement.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Equipment from "../models/Equipment.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";
import { computeItemStatus, recordStockMovement } from "../services/inventoryService.js";

export const loadInventoryItem = async (id) => {
  const item = await findByAnyId(InventoryItem, id, "itemId");
  if (!item) throw new ApiError(404, "Inventory item not found");
  return item;
};

/* ---------------------------------- List ---------------------------------- */

export const listInventory = asyncHandler(async (req, res) => {
  const { search, category, status, departmentId, vendorId, expiry } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (departmentId) filter.departmentId = departmentId;
  if (vendorId) filter.vendorId = vendorId;

  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) {
    filter.$or = [{ departmentId: req.user.departmentId }, { departmentId: null }];
  }

  if (expiry === "expiring_soon") {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    filter.expiryDate = { $gte: new Date(), $lte: in30Days };
  } else if (expiry === "expired") {
    filter.expiryDate = { $lt: new Date() };
  }

  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [
      { name: rx },
      { itemId: rx },
      { sku: rx },
      { manufacturer: rx },
      { description: rx },
      { batchNumber: rx },
      { storageLocation: rx },
    ];
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate("departmentId", "name code")
      .populate("vendorId", "name vendorId")
      .sort({ itemId: 1 })
      .skip(skip)
      .limit(limit),
    InventoryItem.countDocuments(filter),
  ]);

  return ok(res, {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* ---------------------------------- Stats --------------------------------- */

export const getInventoryStats = asyncHandler(async (_req, res) => {
  const [totalItems, lowStock, outOfStock, items] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryItem.countDocuments({ status: "LOW_STOCK" }),
    InventoryItem.countDocuments({ status: "OUT_OF_STOCK" }),
    InventoryItem.find().select("totalValue category departmentId expiryDate quantity reorderLevel minStockLevel").lean(),
  ]);

  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  let totalStockValue = 0;
  let expiringItems = 0;
  const categoryMap = {};

  for (const it of items) {
    totalStockValue += it.totalValue || 0;
    if (it.expiryDate && new Date(it.expiryDate) >= now && new Date(it.expiryDate) <= in30Days) {
      expiringItems++;
    }
    const cat = it.category || "OTHER";
    categoryMap[cat] = (categoryMap[cat] || 0) + (it.totalValue || 0);
  }

  const byCategory = Object.entries(categoryMap).map(([category, value]) => ({
    category,
    value: Math.round(value * 100) / 100,
  }));

  const byDepartment = await InventoryItem.aggregate([
    { $group: { _id: "$departmentId", count: { $sum: 1 }, totalValue: { $sum: "$totalValue" } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    { $project: { name: { $ifNull: ["$department.name", "General / Unassigned"] }, count: 1, totalValue: 1 } },
    { $sort: { totalValue: -1 } },
  ]);

  const recentMovements = await StockMovement.find()
    .populate("itemId", "itemId name unit")
    .populate("performedBy", "name email")
    .populate("departmentId", "name code")
    .sort({ createdAt: -1 })
    .limit(10);

  return ok(res, {
    totalItems,
    totalStockValue: Math.round(totalStockValue * 100) / 100,
    lowStockItems: lowStock,
    outOfStockItems: outOfStock,
    expiringItems,
    byCategory,
    byDepartment,
    recentMovements,
  });
});

/* --------------------------------- Alerts --------------------------------- */

export const getLowStockAlerts = asyncHandler(async (_req, res) => {
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const [lowStock, outOfStock, expiring] = await Promise.all([
    InventoryItem.find({ status: "LOW_STOCK" })
      .populate("departmentId", "name code")
      .populate("vendorId", "name vendorId")
      .limit(50),
    InventoryItem.find({ status: "OUT_OF_STOCK" })
      .populate("departmentId", "name code")
      .populate("vendorId", "name vendorId")
      .limit(50),
    InventoryItem.find({ expiryDate: { $gte: new Date(), $lte: in30Days } })
      .populate("departmentId", "name code")
      .populate("vendorId", "name vendorId")
      .limit(50),
  ]);

  return ok(res, {
    lowStock,
    outOfStock,
    expiring,
    totalAlerts: lowStock.length + outOfStock.length + expiring.length,
  });
});

/* -------------------------------- Details --------------------------------- */

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  await item.populate([
    { path: "departmentId", select: "name code" },
    { path: "vendorId", select: "name vendorId contactPerson email phone" },
    { path: "relatedEquipmentIds", select: "equipmentId name model category status" },
    { path: "createdBy", select: "name email role" },
    { path: "updatedBy", select: "name email role" },
  ]);

  const [movements, relatedPOs] = await Promise.all([
    StockMovement.find({ itemId: item._id })
      .populate("performedBy", "name email")
      .populate("departmentId", "name code")
      .populate("relatedEquipmentId", "equipmentId name")
      .populate("relatedPurchaseOrderId", "purchaseOrderId poNumber title")
      .sort({ createdAt: -1 })
      .limit(50),
    PurchaseOrder.find({ "items.itemCode": item.itemId }).select("purchaseOrderId poNumber title status orderDate").limit(10),
  ]);

  return ok(res, {
    item,
    movements,
    relatedPOs,
  });
});

/* --------------------------------- Create --------------------------------- */

export const createInventoryItem = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name"]);
  if (req.body.category) assertEnum(req.body.category, INVENTORY_CATEGORIES, "category");
  if (req.body.status) assertEnum(req.body.status, INVENTORY_STATUSES, "status");

  const itemId = req.body.itemId || (await nextCode(InventoryItem, "itemId", "INV-", 4));
  const existing = await InventoryItem.findOne({ itemId });
  if (existing) throw new ApiError(409, `Item ID ${itemId} is already in use`);

  const qty = Math.max(0, Number(req.body.quantity) || 0);
  const unitCost = Math.max(0, Number(req.body.unitCost) || 0);
  const totalValue = qty * unitCost;

  const payload = {
    ...req.body,
    itemId,
    quantity: qty,
    availableQuantity: qty,
    reservedQuantity: 0,
    unitCost,
    totalValue,
    expiryDate: assertDate(req.body.expiryDate, "expiryDate"),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  };

  if (!payload.departmentId || payload.departmentId === "") delete payload.departmentId;
  if (!payload.vendorId || payload.vendorId === "") delete payload.vendorId;

  const item = await InventoryItem.create(payload);
  item.status = computeItemStatus(item);
  await item.save();

  if (qty > 0) {
    const movementId = await nextCode(StockMovement, "movementId", "MOV-", 4);
    await StockMovement.create({
      movementId,
      itemId: item._id,
      type: "RECEIPT",
      quantity: qty,
      previousQuantity: 0,
      newQuantity: qty,
      reference: "INITIAL_STOCK",
      performedBy: req.user._id,
      departmentId: item.departmentId,
      reason: "Initial inventory registration",
      unitCost,
      totalCost: totalValue,
    });
  }

  await logAudit({
    user: req.user,
    action: "INVENTORY_CREATED",
    module: "Inventory",
    recordId: item.itemId,
    newStatus: item.status,
    description: `Registered inventory item ${item.itemId} · ${item.name} (${qty} ${item.unit || "units"})`,
  });

  return created(res, item, "Inventory item created");
});

/* --------------------------------- Update --------------------------------- */

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);

  if (req.body.category) assertEnum(req.body.category, INVENTORY_CATEGORIES, "category");
  if (req.body.status) assertEnum(req.body.status, INVENTORY_STATUSES, "status");

  const fields = [
    "name",
    "sku",
    "category",
    "itemType",
    "description",
    "manufacturer",
    "vendorId",
    "unit",
    "minStockLevel",
    "maxStockLevel",
    "reorderLevel",
    "storageLocation",
    "departmentId",
    "batchNumber",
    "serialNumber",
    "relatedEquipmentIds",
  ];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if ((f === "departmentId" || f === "vendorId") && (req.body[f] === "" || req.body[f] === null)) {
        item[f] = undefined;
      } else {
        item[f] = req.body[f];
      }
    }
  }

  if (req.body.expiryDate !== undefined) {
    item.expiryDate = assertDate(req.body.expiryDate, "expiryDate");
  }

  if (req.body.unitCost !== undefined) {
    const cost = Math.max(0, Number(req.body.unitCost) || 0);
    item.unitCost = cost;
    item.totalValue = item.quantity * cost;
  }

  item.status = computeItemStatus(item);
  item.updatedBy = req.user._id;

  await item.save();

  await logAudit({
    user: req.user,
    action: "INVENTORY_UPDATED",
    module: "Inventory",
    recordId: item.itemId,
    description: `Updated inventory item ${item.itemId} · ${item.name}`,
  });

  return ok(res, item, "Inventory item updated");
});

/* --------------------------------- Delete --------------------------------- */

export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);

  if (item.reservedQuantity > 0) {
    throw new ApiError(409, `Cannot delete item ${item.itemId} with reserved quantity (${item.reservedQuantity})`);
  }

  await item.deleteOne();

  await logAudit({
    user: req.user,
    action: "INVENTORY_DELETED",
    module: "Inventory",
    recordId: item.itemId,
    description: `Deleted inventory item ${item.itemId} · ${item.name}`,
  });

  return ok(res, null, "Inventory item deleted");
});

/* --------------------------- Stock Operations ----------------------------- */

export const receiveStock = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  requireFields(req.body, ["quantity"]);

  const {
    quantity,
    unitCost,
    batchNumber,
    expiryDate,
    purchaseOrderId,
    poItemId,
    reference,
    reason,
    notes,
    storageLocation,
  } = req.body;

  if (expiryDate) {
    item.expiryDate = assertDate(expiryDate, "expiryDate");
  }

  let poRecord = null;
  if (purchaseOrderId) {
    poRecord = await findByAnyId(PurchaseOrder, purchaseOrderId, "purchaseOrderId");
  }

  const { item: updated, movement } = await recordStockMovement({
    item,
    type: "RECEIPT",
    quantity,
    user: req.user,
    reference: reference || (poRecord ? poRecord.purchaseOrderId : "MANUAL_RECEIPT"),
    reason: reason || "Stock replenishment",
    notes,
    batchNumber,
    unitCost,
    relatedPurchaseOrderId: poRecord?._id,
    storageLocation,
  });

  if (poRecord && poItemId) {
    const lineItem = poRecord.items.id(poItemId);
    if (lineItem) {
      lineItem.receivedQuantity = (lineItem.receivedQuantity || 0) + Number(quantity);
      await poRecord.save();
    }
  }

  return ok(res, { item: updated, movement }, "Stock received successfully");
});

export const issueStock = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  requireFields(req.body, ["quantity"]);

  const {
    quantity,
    departmentId,
    equipmentId,
    workOrderId,
    reference,
    reason,
    notes,
  } = req.body;

  let eqDoc = null;
  if (equipmentId) {
    eqDoc = await findByAnyId(Equipment, equipmentId, "equipmentId");
  }

  const { item: updated, movement } = await recordStockMovement({
    item,
    type: "ISSUE",
    quantity,
    user: req.user,
    reference: reference || (eqDoc ? eqDoc.equipmentId : "DEPARTMENT_ISSUE"),
    reason: reason || "Part issued for maintenance/service",
    notes,
    departmentId: departmentId || item.departmentId,
    relatedEquipmentId: eqDoc?._id,
    relatedWorkOrderId: workOrderId,
  });

  return ok(res, { item: updated, movement }, "Stock issued successfully");
});

export const returnStock = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  requireFields(req.body, ["quantity"]);

  const { quantity, reference, reason, notes, departmentId } = req.body;

  const { item: updated, movement } = await recordStockMovement({
    item,
    type: "RETURN",
    quantity,
    user: req.user,
    reference: reference || "STOCK_RETURN",
    reason: reason || "Unused part returned to inventory",
    notes,
    departmentId: departmentId || item.departmentId,
  });

  return ok(res, { item: updated, movement }, "Stock returned successfully");
});

export const adjustStock = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  requireFields(req.body, ["newQuantity"]);

  const { newQuantity, reason, notes, unitCost } = req.body;

  const { item: updated, movement } = await recordStockMovement({
    item,
    type: "ADJUSTMENT",
    quantity: Number(newQuantity),
    user: req.user,
    reference: "AUDIT_ADJUSTMENT",
    reason: reason || "Physical stock count adjustment",
    notes,
    unitCost,
  });

  return ok(res, { item: updated, movement }, "Stock adjusted successfully");
});

export const transferStock = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  requireFields(req.body, ["quantity", "targetDepartmentId"]);

  const { quantity, targetDepartmentId, targetStorageLocation, reason, notes } = req.body;

  const { item: updated, movement } = await recordStockMovement({
    item,
    type: "TRANSFER",
    quantity,
    user: req.user,
    reference: "INTER_DEPT_TRANSFER",
    reason: reason || "Department transfer",
    notes,
    targetDepartmentId,
    targetStorageLocation,
  });

  return ok(res, { item: updated, movement }, "Stock transferred successfully");
});

/* ------------------------------- Movements -------------------------------- */

export const getItemMovements = asyncHandler(async (req, res) => {
  const item = await loadInventoryItem(req.params.id);
  const { page, limit, skip } = paginate(req.query);

  const [items, total] = await Promise.all([
    StockMovement.find({ itemId: item._id })
      .populate("performedBy", "name email")
      .populate("departmentId", "name code")
      .populate("relatedEquipmentId", "equipmentId name")
      .populate("relatedPurchaseOrderId", "purchaseOrderId poNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockMovement.countDocuments({ itemId: item._id }),
  ]);

  return ok(res, {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getAllMovements = asyncHandler(async (req, res) => {
  const { type, itemId, dateFrom, dateTo } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (type) filter.type = type;
  if (itemId) {
    const it = await findByAnyId(InventoryItem, itemId, "itemId");
    if (it) filter.itemId = it._id;
  }

  const from = assertDate(dateFrom, "dateFrom");
  const to = assertDate(dateTo, "dateTo");
  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .populate("itemId", "itemId name unit category")
      .populate("performedBy", "name email")
      .populate("departmentId", "name code")
      .populate("relatedEquipmentId", "equipmentId name")
      .populate("relatedPurchaseOrderId", "purchaseOrderId poNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockMovement.countDocuments(filter),
  ]);

  return ok(res, {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});
