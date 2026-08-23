import AuditLog from "../models/AuditLog.js";

/** Central audit-trail writer. Every state change funnels through here. */
export async function logAudit({
  user,
  action,
  module,
  recordId,
  equipmentId,
  workOrderId,
  maintenanceId,
  previousStatus,
  newStatus,
  description,
  metadata,
}) {
  return AuditLog.create({
    userId: user?._id,
    userName: user?.name,
    role: user?.role,
    action,
    module,
    recordId: recordId ? String(recordId) : undefined,
    equipmentId,
    workOrderId,
    maintenanceId,
    previousStatus,
    newStatus,
    description,
    metadata,
    timestamp: new Date(),
  });
}
