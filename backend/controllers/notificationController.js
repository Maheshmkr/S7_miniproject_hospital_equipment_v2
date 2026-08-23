import Notification from "../models/Notification.js";
import Equipment from "../models/Equipment.js";
import Warranty from "../models/Warranty.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import InventoryItem from "../models/InventoryItem.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { paginate } from "../services/validate.js";
import { nextCode } from "../services/lifecycleService.js";

/** Generate live notifications dynamically from asset, maintenance, warranty, and stock states. */
async function generateLiveNotifications(user) {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 86400000);
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const list = [];

  // Low stock and expiring stock
  const [lowStockItems, expiringStock] = await Promise.all([
    InventoryItem.find({ status: { $in: ["LOW_STOCK", "OUT_OF_STOCK"] } }).limit(10).lean(),
    InventoryItem.find({ expiryDate: { $gte: now, $lte: in30Days } }).limit(5).lean(),
  ]);

  for (const item of lowStockItems) {
    list.push({
      _id: `live-inv-${item._id}`,
      id: `live-inv-${item._id}`,
      title: `Low stock alert: ${item.name}`,
      message: `${item.itemId} has ${item.availableQuantity} ${item.unit || "units"} remaining (reorder level: ${item.reorderLevel ?? 10})`,
      type: "LOW_INVENTORY_STOCK",
      severity: item.quantity === 0 ? "DANGER" : "WARNING",
      sourceModule: "Inventory",
      sourceId: item.itemId,
      link: `/inventory/${item.itemId}`,
      isRead: false,
      createdAt: item.updatedAt || now,
    });
  }

  for (const item of expiringStock) {
    list.push({
      _id: `live-exp-${item._id}`,
      id: `live-exp-${item._id}`,
      title: `Stock expiring soon: ${item.name}`,
      message: `${item.itemId} batch ${item.batchNumber || "N/A"} expires on ${new Date(item.expiryDate).toLocaleDateString("en-GB")}`,
      type: "INVENTORY_EXPIRY",
      severity: "WARNING",
      sourceModule: "Inventory",
      sourceId: item.itemId,
      link: `/inventory/${item.itemId}`,
      isRead: false,
      createdAt: item.updatedAt || now,
    });
  }

  // Preventive maintenance due
  const pmDue = await Equipment.find({
    nextPreventiveDate: { $lte: in14Days },
    status: { $ne: "RETIRED" },
  }).limit(5).lean();

  for (const eq of pmDue) {
    const isOverdue = new Date(eq.nextPreventiveDate) < now;
    list.push({
      _id: `live-pm-${eq._id}`,
      id: `live-pm-${eq._id}`,
      title: isOverdue ? `PM overdue: ${eq.name}` : `PM due soon: ${eq.name}`,
      message: `${eq.equipmentId} (${eq.category}) scheduled for preventive maintenance on ${new Date(eq.nextPreventiveDate).toLocaleDateString("en-GB")}`,
      type: "PREVENTIVE_DUE",
      severity: isOverdue ? "DANGER" : "WARNING",
      sourceModule: "Preventive",
      sourceId: eq.equipmentId,
      link: `/equipment/${eq.equipmentId}`,
      isRead: false,
      createdAt: eq.updatedAt || now,
    });
  }

  // Calibration due
  const calDue = await Equipment.find({
    nextCalibrationDate: { $lte: in14Days },
    status: { $ne: "RETIRED" },
  }).limit(5).lean();

  for (const eq of calDue) {
    list.push({
      _id: `live-cal-${eq._id}`,
      id: `live-cal-${eq._id}`,
      title: `Calibration due: ${eq.name}`,
      message: `${eq.equipmentId} calibration verification required`,
      type: "CALIBRATION_DUE",
      severity: "WARNING",
      sourceModule: "Calibration",
      sourceId: eq.equipmentId,
      link: `/equipment/${eq.equipmentId}`,
      isRead: false,
      createdAt: eq.updatedAt || now,
    });
  }

  // Purchase order pending approval (for admins and engineers)
  if (user.role === "ADMINISTRATOR" || user.role === "BIOMEDICAL_ENGINEER") {
    const pendingPOs = await PurchaseOrder.find({ status: "PENDING_APPROVAL" }).limit(5).lean();
    for (const po of pendingPOs) {
      list.push({
        _id: `live-po-${po._id}`,
        id: `live-po-${po._id}`,
        title: `PO pending approval: ${po.poNumber || po.purchaseOrderId}`,
        message: `${po.title || "Purchase order"} for ${po.currency || "USD"} ${po.totalAmount} awaits authorization`,
        type: "PURCHASE_ORDER_STATUS",
        severity: "INFO",
        sourceModule: "PurchaseOrder",
        sourceId: po.purchaseOrderId,
        link: `/purchase-orders/${po.purchaseOrderId}`,
        isRead: false,
        createdAt: po.createdAt || now,
      });
    }
  }

  // Open complaints
  const complaintsFilter = { status: { $in: ["OPEN", "UNDER_REVIEW", "ASSIGNED"] } };
  if (user.role === "DEPARTMENT_STAFF" && user.departmentId) {
    complaintsFilter.departmentId = user.departmentId;
  }
  const openComplaints = await Complaint.find(complaintsFilter).sort({ createdAt: -1 }).limit(5).lean();
  for (const c of openComplaints) {
    list.push({
      _id: `live-cmp-${c._id}`,
      id: `live-cmp-${c._id}`,
      title: `Complaint open: ${c.complaintId}`,
      message: `${c.description || "Equipment breakdown"} (${c.priority} priority)`,
      type: "COMPLAINT_UPDATE",
      severity: c.priority === "CRITICAL" ? "DANGER" : "WARNING",
      sourceModule: "Complaint",
      sourceId: c.complaintId,
      link: `/complaints/${c.complaintId}`,
      isRead: false,
      createdAt: c.createdAt || now,
    });
  }

  return list;
}

export const listNotifications = asyncHandler(async (req, res) => {
  const { type, severity, isRead } = req.query;
  const user = req.user;

  const dbFilter = {
    $or: [
      { userId: user._id },
      { role: user.role },
      { role: null, userId: null },
    ],
  };

  if (user.departmentId) {
    dbFilter.$or.push({ departmentId: user.departmentId });
  }

  if (type) dbFilter.type = type;
  if (severity) dbFilter.severity = severity;
  if (isRead !== undefined) dbFilter.isRead = isRead === "true";

  const [dbNotifications, liveNotifications] = await Promise.all([
    Notification.find(dbFilter).sort({ createdAt: -1 }).limit(50).lean(),
    generateLiveNotifications(user),
  ]);

  // Combine and sort by createdAt desc
  const all = [...liveNotifications, ...dbNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const unreadCount = all.filter((n) => !n.isRead).length;

  return ok(res, {
    items: all,
    total: all.length,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id.startsWith("live-")) {
    return ok(res, { id, isRead: true }, "Notification marked as read");
  }

  const notif = await Notification.findById(id);
  if (!notif) throw new ApiError(404, "Notification not found");

  notif.isRead = true;
  if (!notif.readBy.some((r) => String(r.userId) === String(req.user._id))) {
    notif.readBy.push({ userId: req.user._id, readAt: new Date() });
  }
  await notif.save();

  return ok(res, notif, "Notification marked as read");
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      $or: [
        { userId: req.user._id },
        { role: req.user.role },
        { role: null, userId: null },
      ],
      isRead: false,
    },
    {
      $set: { isRead: true },
      $push: { readBy: { userId: req.user._id, readAt: new Date() } },
    },
  );

  return ok(res, null, "All notifications marked as read");
});

export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type, severity, link, sourceModule, sourceId, role, departmentId } = req.body;
  if (!title || !message) throw new ApiError(400, "Title and message are required");

  const notificationId = await nextCode(Notification, "notificationId", "NOTIF-", 4);
  const notif = await Notification.create({
    notificationId,
    title,
    message,
    type: type || "GENERAL",
    severity: severity || "INFO",
    link,
    sourceModule,
    sourceId,
    role,
    departmentId,
    userId: req.body.userId,
  });

  return created(res, notif, "Notification created");
});
