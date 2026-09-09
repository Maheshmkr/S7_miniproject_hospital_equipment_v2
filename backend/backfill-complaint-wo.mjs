import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/hospital_equipment");
  const Complaint = mongoose.model("Complaint", new mongoose.Schema({}, { strict: false }));
  const WorkOrder = mongoose.model("WorkOrder", new mongoose.Schema({}, { strict: false }));

  const complaints = await Complaint.find({ $or: [{ workOrderId: { $exists: false } }, { workOrderId: null }] });
  console.log("Found unlinked complaints:", complaints.length);

  for (const c of complaints) {
    const existingWO = await WorkOrder.findOne({ complaintId: c._id });
    if (existingWO) {
      c.workOrderId = existingWO._id;
      await c.save();
      console.log("Linked existing WO for:", c.complaintId);
    } else {
      const woCount = await WorkOrder.countDocuments();
      const code = `WO-${String(4490 + woCount).padStart(4, "0")}`;
      const newWO = await WorkOrder.create({
        workOrderId: code,
        title: `Investigate ${c.title}`,
        equipmentId: c.equipmentId,
        complaintId: c._id,
        departmentId: c.departmentId,
        engineerId: c.assignedEngineerId || null,
        maintenanceType: "CORRECTIVE",
        priority: c.priority || "MEDIUM",
        status: "ASSIGNED",
        description: c.description || c.title,
        createdBy: c.reportedBy,
      });
      c.workOrderId = newWO._id;
      await c.save();
      console.log("Created and linked new WO:", newWO.workOrderId, "for complaint:", c.complaintId);
    }
  }
  await mongoose.disconnect();
  console.log("Done backfill.");
}

main().catch(console.error);
