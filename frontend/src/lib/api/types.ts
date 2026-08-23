/** Shared API DTOs — mirror the Mongoose models one-to-one. */

export type ApiRole = "ADMINISTRATOR" | "BIOMEDICAL_ENGINEER" | "DEPARTMENT_STAFF";

export type ApiUser = {
  _id: string;
  name: string;
  email: string;
  role: ApiRole;
  title?: string;
  initials?: string;
  employeeId?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  departmentId?: string | ApiDepartment;
};

export type ApiDepartment = {
  _id: string;
  code: string;
  name: string;
  building?: string;
  floor?: string;
  headName?: string;
  active: boolean;
};

export type ApiEquipmentStatus =
  | "ACTIVE"
  | "UNDER_BREAKDOWN"
  | "UNDER_MAINTENANCE"
  | "AWAITING_PARTS"
  | "MAINTENANCE_COMPLETED"
  | "UNDER_VERIFICATION"
  | "OPERATIONAL"
  | "OUT_OF_SERVICE"
  | "RETIRED";

export type ApiEquipment = {
  _id: string;
  equipmentId: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  departmentId?: string | ApiDepartment;
  location?: string;
  status: ApiEquipmentStatus;
  healthScore: number;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  purchaseDate?: string;
  installationDate?: string;
  cost?: string;
  description?: string;
  vendor?: string;
  owner?: string;
  power?: string;
  softwareVersion?: string;
  riskClass?: string;
  warrantyExpiry?: string;
  lastPreventiveDate?: string;
  nextPreventiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiComplaintStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "INVESTIGATION"
  | "MAINTENANCE_IN_PROGRESS"
  | "AWAITING_PARTS"
  | "TESTING"
  | "RESOLVED"
  | "CLOSED";

export type ApiComplaint = {
  _id: string;
  complaintId: string;
  equipmentId: string | ApiEquipment;
  departmentId?: string | ApiDepartment;
  reportedBy?: string | ApiUser;
  assignedEngineerId?: string | ApiUser;
  workOrderId?: string | ApiWorkOrder;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: ApiComplaintStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type ApiWorkOrderStatus =
  "ASSIGNED" | "IN_PROGRESS" | "AWAITING_PARTS" | "UNDER_VERIFICATION" | "COMPLETED" | "CANCELLED";

export type ApiWorkOrder = {
  _id: string;
  workOrderId: string;
  title: string;
  equipmentId: string | ApiEquipment;
  complaintId?: string | ApiComplaint;
  departmentId?: string | ApiDepartment;
  engineerId?: string | ApiUser;
  maintenanceType: "PREVENTIVE" | "CORRECTIVE" | "BREAKDOWN" | "CALIBRATION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: ApiWorkOrderStatus;
  scheduledDate?: string;
  estimatedHours?: number;
  startedAt?: string;
  completedAt?: string;
  description?: string;
  createdAt: string;
};

export type ApiWorkOrderContext = {
  workOrder: ApiWorkOrder;
  equipment: ApiEquipment;
  complaint?: ApiComplaint;
  department?: ApiDepartment;
  engineer?: ApiUser;
  maintenance?: ApiMaintenance;
};

export type ApiChecklistResponseType =
  "YES_NO" | "PASS_FAIL" | "TEXT" | "NUMBER" | "DROPDOWN" | "DATE" | "EVIDENCE";

export type ApiChecklistTemplate = {
  _id: string;
  name: string;
  equipmentCategory?: string;
  equipmentId?: string;
  maintenanceType: "PREVENTIVE" | "CORRECTIVE" | "BREAKDOWN" | "CALIBRATION" | "ALL";
  description?: string;
  active: boolean;
  questionCount?: number;
};

export type ApiChecklistQuestion = {
  _id: string;
  templateId: string;
  question: string;
  responseType: ApiChecklistResponseType;
  options?: string[];
  required: boolean;
  priority: "STANDARD" | "IMPORTANT" | "CRITICAL";
  order: number;
  helpText?: string;
  active: boolean;
  scope?: "category" | "equipment";
};

export type ApiChecklistResponse = {
  _id: string;
  questionId: string;
  response: string;
  outcome: "PASS" | "FAIL" | "NA" | "ANSWERED";
  notes?: string;
};

export type ApiMaintenance = {
  _id: string;
  maintenanceId: string;
  workOrderId: string | ApiWorkOrder;
  equipmentId: string | ApiEquipment;
  complaintId?: string | ApiComplaint;
  departmentId?: string | ApiDepartment;
  engineerId: string | ApiUser;
  maintenanceType: string;
  description?: string;
  partsUsed?: { name?: string; partNo?: string; qty?: number; cost?: number }[];
  createdAt?: string;
  updatedAt?: string;
  status:
    | "STARTED"
    | "INVESTIGATION"
    | "IN_PROGRESS"
    | "AWAITING_PARTS"
    | "TESTING"
    | "COMPLETED"
    | "CANCELLED";
  startTime?: string;
  endTime?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  finalCondition?: string;
  remarks?: string;
};

export type ApiInvestigation = {
  _id: string;
  problemObserved?: string;
  diagnosticFindings?: string;
  rootCauseCategory?: string;
  rootCause?: string;
  contributingFactor?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  partsReplaced?: { name: string; partNo: string; qty: number; cost: number }[];
};

export type ApiEvidence = {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  category: string;
  createdAt: string;
};

export type ApiServiceReport = {
  _id: string;
  serviceReportId: string;
  maintenanceId: string;
  workOrderId?: string | ApiWorkOrder;
  equipmentId?: string | ApiEquipment;
  engineerId?: string | ApiUser;
  problem?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  testResult?: string;
  finalCondition?: string;
  engineerRemarks?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
};

export type ApiVendorCategory =
  | "EQUIPMENT_SUPPLIER"
  | "MANUFACTURER"
  | "SERVICE_PROVIDER"
  | "CALIBRATION_PROVIDER"
  | "MAINTENANCE_PROVIDER"
  | "OTHER";

export type ApiVendorStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type ApiVendor = {
  _id: string;
  vendorId: string;
  name: string;
  legalName?: string;
  category: ApiVendorCategory;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  registrationNumber?: string;
  specialization?: string;
  status: ApiVendorStatus;
  rating?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiWarranty = {
  _id: string;
  warrantyId: string;
  kind: "WARRANTY" | "AMC";
  equipmentId: string | ApiEquipment;
  departmentId?: string | ApiDepartment;
  /** Legacy free-text vendor name — always present for older contracts. */
  vendor?: string;
  /** Optional link into the Vendor register (populated object when available). */
  vendorId?: string | ApiVendor;
  startDate: string;
  endDate: string;
  coverage?: string;
  terms?: string;
  contractNumber?: string;
  contractType?: string;
  value?: string;
  notes?: string;
  /** ACTIVE | EXPIRING | EXPIRED | CANCELLED — derived server-side. */
  status: string;
  daysRemaining: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiAuditLog = {
  _id: string;
  userName?: string;
  role?: string;
  action: string;
  module: string;
  recordId?: string;
  previousStatus?: string;
  newStatus?: string;
  description?: string;
  timestamp: string;
};

export type Paged<T> = { items: T[]; total: number; page: number; limit: number };

export type ApiPreventiveFrequency =
  "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

export type ApiPreventiveScheduleState =
  "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "COMPLETED" | "INACTIVE";

export type ApiPreventivePlan = {
  _id: string;
  preventiveMaintenanceId: string;
  title?: string;
  equipmentId: string | ApiEquipment;
  departmentId?: string | ApiDepartment;
  assignedEngineerId?: string | ApiUser;
  checklistTemplateId?: string | ApiChecklistTemplate;
  frequency: ApiPreventiveFrequency;
  frequencyValue: number;
  startDate: string;
  nextDueDate: string;
  lastCompletedDate?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  instructions?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Derived server-side from nextDueDate — never stored. */
  scheduleState?: ApiPreventiveScheduleState;
  daysUntilDue?: number | null;
};

/* ---------------------------------- Calibration --------------------------------- */

export type ApiCalibrationFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";
export type ApiCalibrationType = "INTERNAL" | "EXTERNAL" | "VENDOR";
export type ApiCalibrationStatus = "SCHEDULED" | "IN_PROGRESS" | "PASSED" | "FAILED" | "CANCELLED";
export type ApiCalibrationResult = "PASS" | "FAIL" | "CONDITIONAL";
export type ApiCalibrationScheduleState =
  "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "COMPLETED" | "INACTIVE";

export type ApiCalibrationMeasurement = {
  parameter?: string;
  unit?: string;
  reference?: string;
  measured?: string;
  tolerance?: string;
  withinTolerance?: boolean;
};

export type ApiCalibration = {
  _id: string;
  calibrationId: string;
  title?: string;
  equipmentId: string | ApiEquipment;
  departmentId?: string | ApiDepartment;
  assignedEngineerId?: string | ApiUser;
  workOrderId?: string | ApiWorkOrder;
  maintenanceId?: string | ApiMaintenance;
  checklistTemplateId?: string | ApiChecklistTemplate;
  calibrationType: ApiCalibrationType;
  calibrationStandard?: string;
  frequency: ApiCalibrationFrequency;
  frequencyDays?: number;
  scheduledDate: string;
  calibrationDate?: string;
  nextCalibrationDate?: string;
  status: ApiCalibrationStatus;
  result?: ApiCalibrationResult;
  certificateNumber?: string;
  certificateUrl?: string;
  measuredValues?: ApiCalibrationMeasurement[];
  tolerance?: string;
  findings?: string;
  correctiveAction?: string;
  notes?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Derived server-side — never stored. */
  scheduleState?: ApiCalibrationScheduleState;
  daysUntilDue?: number | null;
};

export type ApiCalibrationCompletion = {
  result: ApiCalibrationResult;
  calibrationDate?: string;
  nextCalibrationDate?: string;
  engineerId?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  measuredValues?: ApiCalibrationMeasurement[];
  findings?: string;
  correctiveAction?: string;
  notes?: string;
  checklistResponses?: { questionId: string; response: string; notes?: string }[];
};

/* -------------------------------- Purchase Orders ------------------------------- */

export type ApiPurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type ApiPurchaseOrderItem = {
  _id?: string;
  description: string;
  itemCode?: string;
  equipmentId?: string | ApiEquipment;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total?: number;
  specification?: string;
  notes?: string;
  receivedQuantity?: number;
};

export type ApiPurchaseOrder = {
  _id: string;
  purchaseOrderId: string;
  poNumber?: string;
  vendorId: string | ApiVendor;
  departmentId?: string | ApiDepartment;
  requestedBy?: string | ApiUser;
  approvedBy?: string | ApiUser;
  approvedAt?: string;
  rejectedBy?: string | ApiUser;
  rejectedAt?: string;
  rejectionReason?: string;
  title?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  status: ApiPurchaseOrderStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  items: ApiPurchaseOrderItem[];
  /** All money fields are computed server-side — never sent by the client. */
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiPurchaseOrderInput = {
  vendorId: string;
  departmentId?: string;
  title?: string;
  poNumber?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  status?: "DRAFT" | "PENDING_APPROVAL";
  priority?: string;
  items: {
    description: string;
    itemCode?: string;
    equipmentId?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountRate?: number;
    specification?: string;
    notes?: string;
  }[];
  shippingCost?: number;
  currency?: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  notes?: string;
};

/* --------------------------------- Inventory -------------------------------- */

export type ApiInventoryCategory =
  "SPARE_PARTS" | "CONSUMABLES" | "REAGENTS" | "ACCESSORIES" | "TOOLS" | "IMPLANTS" | "OTHER";

export type ApiInventoryStatus =
  "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRED" | "DISCONTINUED";

export type ApiInventoryItem = {
  _id: string;
  itemId: string;
  sku?: string;
  name: string;
  category: ApiInventoryCategory | string;
  itemType?: string;
  description?: string;
  manufacturer?: string;
  vendorId?: string | ApiVendor;
  unit: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  unitCost: number;
  totalValue: number;
  storageLocation?: string;
  departmentId?: string | ApiDepartment;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  status: ApiInventoryStatus;
  relatedEquipmentIds?: (string | ApiEquipment)[];
  createdBy?: string | ApiUser;
  updatedBy?: string | ApiUser;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiStockMovementType = "RECEIPT" | "ISSUE" | "RETURN" | "ADJUSTMENT" | "TRANSFER";

export type ApiStockMovement = {
  _id: string;
  movementId: string;
  itemId: string | ApiInventoryItem;
  type: ApiStockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reference?: string;
  relatedEquipmentId?: string | ApiEquipment;
  relatedPurchaseOrderId?: string | ApiPurchaseOrder;
  relatedWorkOrderId?: string | ApiWorkOrder;
  performedBy?: string | ApiUser;
  departmentId?: string | ApiDepartment;
  reason?: string;
  notes?: string;
  batchNumber?: string;
  unitCost: number;
  totalCost: number;
  storageLocation?: string;
  targetDepartmentId?: string | ApiDepartment;
  targetStorageLocation?: string;
  createdAt: string;
};

export type ApiInventoryInput = {
  name: string;
  itemId?: string;
  sku?: string;
  category?: string;
  itemType?: string;
  description?: string;
  manufacturer?: string;
  vendorId?: string;
  unit?: string;
  quantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  unitCost?: number;
  storageLocation?: string;
  departmentId?: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  status?: string;
  relatedEquipmentIds?: string[];
};

export type ApiInventoryStats = {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringItems: number;
  byCategory: { category: string; value: number }[];
  byDepartment: { _id: string; name: string; count: number; totalValue: number }[];
  recentMovements: ApiStockMovement[];
};

export type ApiInventoryAlerts = {
  lowStock: ApiInventoryItem[];
  outOfStock: ApiInventoryItem[];
  expiring: ApiInventoryItem[];
  totalAlerts: number;
};

/* ------------------------------- Notifications ------------------------------ */

export type ApiNotificationType =
  | "MAINTENANCE_DUE"
  | "PREVENTIVE_DUE"
  | "CALIBRATION_DUE"
  | "WARRANTY_EXPIRY"
  | "AMC_EXPIRY"
  | "COMPLAINT_UPDATE"
  | "WORK_ORDER_UPDATE"
  | "LOW_INVENTORY_STOCK"
  | "INVENTORY_EXPIRY"
  | "PURCHASE_ORDER_STATUS"
  | "GENERAL";

export type ApiNotificationSeverity = "INFO" | "WARNING" | "DANGER" | "SUCCESS";

export type ApiNotification = {
  _id: string;
  id?: string;
  notificationId?: string;
  title: string;
  message: string;
  type: ApiNotificationType;
  severity: ApiNotificationSeverity;
  sourceModule?: string;
  sourceId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};
