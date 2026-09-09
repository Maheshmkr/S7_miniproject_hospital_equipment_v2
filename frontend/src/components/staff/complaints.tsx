import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock,
  Cpu,
  Download,
  FileText,
  Filter,
  Images,
  MessageSquare,
  Paperclip,
  Phone,
  Search,
  Send,
  UserRound,
  Wrench,
  Loader2,
} from "lucide-react";
import { EmptyState, Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { apiEnabled } from "@/lib/api/client";
import {
  useComplaintMutations,
  useComplaintList,
  useComplaintRecord,
} from "@/lib/api/useComplaints";
import { useEquipmentList } from "@/lib/api/useEquipment";
import { useMaintenanceList, useMaintenanceRecord } from "@/lib/api/useMaintenance";
import {
  ActionButton,
  ActionLink,
  DefRow,
  StaffCrumbs,
  StaffHero,
  StaffTabs,
  StaffTimeline,
  StatCard,
  TagPills,
} from "@/components/staff/kit";
import {
  complaintById,
  complaintCategories,
  complaintStatusTone,
  deptEngineers,
  equipmentById,
  maintenanceById,
  maintenanceStatusTone,
  priorityTone,
  reportById,
  staffComplaints,
  staffEquipment,
  staffMaintenance,
  staffProfile,
  type StaffComplaint,
  type Tone,
} from "@/lib/staff";
import { cn } from "@/lib/utils";

/* ============================= Register complaint ============================ */

const steps = [
  { key: 1, label: "Equipment & category" },
  { key: 2, label: "Issue details" },
  { key: 3, label: "Visit & contact" },
  { key: 4, label: "Review & submit" },
];

const fieldCls =
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs outline-none transition-colors focus:border-primary";
const labelCls = "text-[12px] font-semibold text-muted-foreground";

export function RegisterComplaint() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("CMP-8851");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { create } = useComplaintMutations();
  const { items: liveEquipment, loading: equipLoading } = useEquipmentList(
    apiEnabled ? {} : { limit: 0 },
  );

  const [form, setForm] = useState({
    equipmentId: staffEquipment[0]!.id,
    category: complaintCategories[0]! as StaffComplaint["category"],
    priority: "High" as StaffComplaint["priority"],
    description: "",
    symptoms: [] as string[],
    photos: ["fault-photo-1.jpg"],
    documents: ["error-log.txt"],
    visit: "",
    contactName: staffProfile.name,
    contactNumber: staffProfile.phone,
  });

  useEffect(() => {
    if (apiEnabled && liveEquipment && liveEquipment.length > 0) {
      const firstId = liveEquipment[0]._id;
      setForm((f) => ({ ...f, equipmentId: firstId }));
    }
  }, [liveEquipment]);

  const asset = useMemo(() => {
    if (!apiEnabled || !liveEquipment) {
      return equipmentById(form.equipmentId);
    }
    const live = liveEquipment.find(
      (e) => e._id === form.equipmentId || e.equipmentId === form.equipmentId,
    );
    if (!live) return null;
    return {
      id: live.equipmentId,
      _id: live._id,
      name: live.name,
      category: live.category,
      manufacturer: live.manufacturer || "Unknown",
      dept:
        typeof live.departmentId === "object" && live.departmentId
          ? live.departmentId.name
          : "Radiology",
      location: live.location || "Main Clinic",
      status: live.status,
      health: live.healthScore ?? 100,
    };
  }, [liveEquipment, form.equipmentId]) as any;

  const submit = () => {
    if (!apiEnabled || !asset) {
      setSubmitted(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    void create({
      title: `${form.category} — ${asset.name}`,
      description: [
        form.description,
        form.symptoms.length ? `Symptoms: ${form.symptoms.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      equipment: asset.id,
      priority: form.priority,
    })
      .then((complaint) => {
        setReference(complaint.complaintId || complaint._id);
        setSubmitted(true);
      })
      .catch((err: unknown) =>
        setSaveError(err instanceof Error ? err.message : "Unable to register this complaint."),
      )
      .finally(() => setSaving(false));
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggleSymptom = (s: string) =>
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(s) ? f.symptoms.filter((x) => x !== s) : [...f.symptoms, s],
    }));

  if (submitted) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <StaffCrumbs
          trail={[{ label: "Complaints", to: "/staff/complaints" }, { label: "Registered" }]}
        />
        <Panel>
          <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
              <CheckCircle2 className="size-8" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Complaint registered</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Reference <span className="font-semibold text-foreground">{reference}</span> has
                been raised against {asset.name}. A biomedical engineer will be assigned shortly and
                you will be notified of every update.
              </p>
            </div>
            <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
              {[
                { l: "Reference", v: reference },
                { l: "Priority", v: form.priority },
                { l: "First response", v: form.priority === "Critical" ? "4 h" : "1 working day" },
              ].map((i) => (
                <div key={i.l} className="rounded-2xl bg-surface-muted/70 py-4">
                  <p className="text-[15px] font-bold">{i.v}</p>
                  <p className="text-[11px] text-muted-foreground">{i.l}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ActionLink to="/staff/complaints" variant="primary">
                Track complaint status
              </ActionLink>
              <ActionLink to="/staff">Back to dashboard</ActionLink>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (apiEnabled && equipLoading) {
    return (
      <div className="mx-auto max-w-[1200px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading department assets…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <StaffCrumbs
        trail={[{ label: "Complaints", to: "/staff/complaints" }, { label: "Register complaint" }]}
      />
      <StaffHero
        eyebrow="Complaints"
        title="Register an equipment complaint"
        description="Four quick steps. Give us as much detail as you can — clear symptoms and photos help engineers arrive prepared."
      />

      <Panel>
        <div className="grid gap-3 px-6 pt-6 sm:grid-cols-4 sm:px-7">
          {steps.map((s) => (
            <div
              key={s.key}
              className={cn(
                "rounded-2xl border px-4 py-3 transition-colors",
                step === s.key
                  ? "border-primary bg-primary-soft"
                  : step > s.key
                    ? "border-border bg-success-soft/40"
                    : "border-border bg-surface",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-lg text-[11px] font-bold",
                    step >= s.key
                      ? "gradient-primary text-white"
                      : "bg-surface-muted text-muted-foreground",
                  )}
                >
                  {step > s.key ? <CheckCircle2 className="size-3.5" /> : s.key}
                </span>
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    step === s.key ? "text-primary" : "text-foreground",
                  )}
                >
                  Step {s.key}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-7 sm:px-7">
          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className={labelCls}>Select equipment</p>
                <select
                  className={cn(fieldCls, "mt-2")}
                  value={form.equipmentId}
                  onChange={(e) => set("equipmentId", e.target.value)}
                >
                  {apiEnabled && liveEquipment
                    ? liveEquipment.map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.equipmentId} — {e.name} · {e.location}
                        </option>
                      ))
                    : staffEquipment.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.id} — {e.name} · {e.location}
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <p className={labelCls}>Complaint category</p>
                <select
                  className={cn(fieldCls, "mt-2")}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as StaffComplaint["category"])}
                >
                  {complaintCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className={labelCls}>Priority</p>
                <select
                  className={cn(fieldCls, "mt-2")}
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value as StaffComplaint["priority"])}
                >
                  {(["Critical", "High", "Medium", "Low"] as const).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted/50 p-5 md:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl gradient-primary text-white">
                    <Cpu className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{asset.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {asset.id} · {asset.location} · health {asset.health}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <div>
                <p className={labelCls}>Issue description</p>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe what happened, when it started and how often it occurs…"
                  className="mt-2 w-full rounded-2xl border border-border bg-surface p-4 text-[13px] shadow-xs outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <p className={labelCls}>Symptoms observed</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "Overheating",
                    "Unusual noise",
                    "Error code",
                    "Image artefact",
                    "Power failure",
                    "Alarm firing",
                    "Slow performance",
                    "Physical damage",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                        form.symptoms.includes(s)
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center">
                  <Camera className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-[13px] font-semibold">Upload photos</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    JPG or PNG up to 10 MB each
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {form.photos.map((p) => (
                      <Pill key={p} tone="primary">
                        {p}
                      </Pill>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <ActionButton
                      onClick={() =>
                        set("photos", [...form.photos, `fault-photo-${form.photos.length + 1}.jpg`])
                      }
                    >
                      Add photo
                    </ActionButton>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center">
                  <Paperclip className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-[13px] font-semibold">Upload documents</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Logs, PDFs or exported reports
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {form.documents.map((d) => (
                      <Pill key={d}>{d}</Pill>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <ActionButton
                      onClick={() =>
                        set("documents", [
                          ...form.documents,
                          `attachment-${form.documents.length + 1}.pdf`,
                        ])
                      }
                    >
                      Add document
                    </ActionButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className={labelCls}>Preferred visit date</p>
                <input
                  type="date"
                  value={form.visit}
                  onChange={(e) => set("visit", e.target.value)}
                  className={cn(fieldCls, "mt-2")}
                />
              </div>
              <div>
                <p className={labelCls}>Preferred time window</p>
                <select className={cn(fieldCls, "mt-2")} defaultValue="Morning · 08:00 – 12:00">
                  {[
                    "Morning · 08:00 – 12:00",
                    "Afternoon · 12:00 – 16:00",
                    "Evening · 16:00 – 20:00",
                    "Any time",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className={labelCls}>Department contact</p>
                <input
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  className={cn(fieldCls, "mt-2")}
                />
              </div>
              <div>
                <p className={labelCls}>Contact number</p>
                <input
                  value={form.contactNumber}
                  onChange={(e) => set("contactNumber", e.target.value)}
                  className={cn(fieldCls, "mt-2")}
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted/50 p-5 md:col-span-2">
                <p className="text-[12.5px] font-semibold">Access notes</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Engineers report to the Radiology reception desk on Level 2. Out-of-hours visits
                  require a security escort — add the details in the description if that applies.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <dl>
                  <DefRow label="Equipment" value={`${asset.id} — ${asset.name}`} />
                  <DefRow label="Location" value={asset.location} />
                  <DefRow label="Category" value={form.category} />
                  <DefRow
                    label="Priority"
                    value={<Pill tone={priorityTone[form.priority]}>{form.priority}</Pill>}
                  />
                  <DefRow
                    label="Description"
                    value={form.description || "No description provided."}
                  />
                  <DefRow
                    label="Symptoms"
                    value={
                      form.symptoms.length ? (
                        <TagPills items={form.symptoms} tone="primary" />
                      ) : (
                        "None selected"
                      )
                    }
                  />
                  <DefRow label="Photos" value={`${form.photos.length} attached`} />
                  <DefRow label="Documents" value={`${form.documents.length} attached`} />
                  <DefRow label="Preferred visit" value={form.visit || "Next available slot"} />
                  <DefRow label="Contact" value={`${form.contactName} · ${form.contactNumber}`} />
                </dl>
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted/50 p-5">
                <p className="text-[12.5px] font-semibold">What happens next</p>
                <ol className="mt-3 space-y-3 text-[12px] text-muted-foreground">
                  {[
                    "Dispatch triages the complaint against SLA",
                    "A biomedical engineer is assigned",
                    "You receive a notification with the visit slot",
                    "Progress is tracked until the service report is issued",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary-soft text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-5 sm:px-7">
          <ActionButton
            icon={<ArrowLeft className="size-4" />}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </ActionButton>
          {saveError ? <p className="text-[12px] text-danger">{saveError}</p> : null}
          {step < 4 ? (
            <ActionButton
              variant="primary"
              icon={<ArrowRight className="size-4" />}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Continue
            </ActionButton>
          ) : (
            <ActionButton variant="primary" icon={<Send className="size-4" />} onClick={submit}>
              {saving ? "Submitting…" : "Submit complaint"}
            </ActionButton>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ============================= Complaint history ============================= */

export function ComplaintHistory() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [range, setRange] = useState("All time");

  const { items: liveComplaints, loading: complaintsLoading } = useComplaintList(
    apiEnabled ? {} : { limit: 0 },
  );

  const displayComplaints = useMemo(() => {
    if (!apiEnabled || !liveComplaints) return staffComplaints;
    return liveComplaints.map((c) => {
      let staffStatus: StaffComplaint["status"] = "Submitted";
      if (c.status === "OPEN") staffStatus = "Submitted";
      else if (c.status === "ASSIGNED") staffStatus = "Assigned";
      else if (c.status === "MAINTENANCE_IN_PROGRESS") staffStatus = "In Progress";
      else if (c.status === "AWAITING_PARTS") staffStatus = "Awaiting Parts";
      else if (c.status === "RESOLVED") staffStatus = "Resolved";
      else if (c.status === "CLOSED") staffStatus = "Closed";

      const eqName =
        typeof c.equipmentId === "object" && c.equipmentId
          ? c.equipmentId.name
          : "Hamilton C6 ICU Ventilator";
      const eqId =
        typeof c.equipmentId === "object" && c.equipmentId
          ? c.equipmentId.equipmentId
          : String(c.equipmentId || "");

      return {
        id: c.complaintId || c._id,
        title: c.title,
        equipmentId: eqId,
        equipmentName: eqName,
        category: "Software" as const,
        priority: (c.priority === "CRITICAL"
          ? "Critical"
          : c.priority === "HIGH"
            ? "High"
            : c.priority === "LOW"
              ? "Low"
              : "Medium") as StaffComplaint["priority"],
        description: c.description,
        status: staffStatus,
        progress: c.status === "RESOLVED" || c.status === "CLOSED" ? 100 : 30,
        engineer:
          typeof c.assignedEngineerId === "object" && c.assignedEngineerId
            ? c.assignedEngineerId.name
            : "Unassigned",
        reportedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
        created: new Date(c.createdAt).toLocaleDateString(),
        updated: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
        expected: "1 working day",
        raisedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
        contact:
          typeof c.reportedBy === "object" && c.reportedBy
            ? c.reportedBy.email || "Staff"
            : "Staff",
        stage:
          c.status === "OPEN" ? "Submitted" : c.status === "ASSIGNED" ? "Scheduled" : "In Progress",
        parts: [],
        remarks: c.resolution || "",
        notes: [],
        messages: [],
        photos: [],
        attachments: [],
        symptoms: c.description.includes("Symptoms:")
          ? c.description
              .split("Symptoms:")[1]
              .split(",")
              .map((s: string) => s.trim())
          : [],
        timeline: [],
        reportId: c.workOrderId ? String(c.workOrderId) : undefined,
      };
    });
  }, [liveComplaints]);

  const rows = useMemo(
    () =>
      displayComplaints.filter((c: any) => {
        const q = query.trim().toLowerCase();
        const eq = equipmentById(c.equipmentId);
        const eqTitle = c.equipmentName || eq?.name || "Hamilton C6 ICU Ventilator";
        const matchQ =
          !q ||
          [c.id, c.title, eqTitle, c.engineer].some((v) => v.toLowerCase().includes(q));
        return (
          matchQ &&
          (status === "All" || c.status === status) &&
          (priority === "All" || c.priority === priority)
        );
      }),
    [query, status, priority, displayComplaints],
  );

  const stats = useMemo(() => {
    const total = displayComplaints.length;
    const open = displayComplaints.filter((c) => !["Resolved", "Closed"].includes(c.status)).length;
    const critical = displayComplaints.filter((c) => c.priority === "Critical").length;
    const closed = displayComplaints.filter((c) =>
      ["Resolved", "Closed"].includes(c.status),
    ).length;
    return { total, open, critical, closed };
  }, [displayComplaints]);

  if (apiEnabled && complaintsLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading complaints history…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Complaints" }]} />
      <StaffHero
        eyebrow="Complaints"
        title="Complaint history"
        description="Track every issue you and your colleagues have reported, from first triage through to the signed service report."
        actions={
          <ActionLink
            to="/staff/complaints/new"
            variant="primary"
            icon={<CircleAlert className="size-4" />}
          >
            Register complaint
          </ActionLink>
        }
      />
      <StaffTabs active="complaints" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total complaints"
          value={stats.total}
          hint="All time"
          tone="primary"
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Open"
          value={stats.open}
          hint="Awaiting resolution"
          tone="warning"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          hint="Highest urgency"
          tone="danger"
          icon={<CircleAlert className="size-4" />}
        />
        <StatCard
          label="Closed"
          value={stats.closed}
          hint="With service report"
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      <Panel>
        <PanelHead
          title="All complaints"
          subtitle={`${rows.length} of ${displayComplaints.length} shown`}
          icon={<Filter className="size-4" />}
        />
        <div className="grid gap-3 px-6 pb-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="flex h-10 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search complaints, equipment or engineer…"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {[
              "All",
              "Submitted",
              "Assigned",
              "In Progress",
              "Awaiting Parts",
              "Resolved",
              "Closed",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {["All", "Critical", "High", "Medium", "Low"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {["All time", "Last 7 days", "Last 30 days", "This quarter"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<CircleAlert className="size-6" />}
            title="No complaints match your filters"
            hint="Adjust the search or filters to see more results."
            action={
              <ActionLink to="/staff/complaints/new" variant="primary">
                Register a complaint
              </ActionLink>
            }
          />
        ) : (
          <div className="overflow-x-auto px-2 pb-6">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {[
                    "Complaint ID",
                    "Equipment",
                    "Priority",
                    "Status",
                    "Engineer",
                    "Created",
                    "Progress",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/staff/complaints/${c.id}` as never}
                        className="text-[12.5px] font-semibold hover:text-primary"
                      >
                        {c.id}
                      </Link>
                      <p className="truncate text-[11.5px] text-muted-foreground">{c.title}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {(c as any).equipmentName || equipmentById(c.equipmentId)?.name || c.equipmentId || "Hamilton C6 ICU Ventilator"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={priorityTone[c.priority]}>{c.priority}</Pill>
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={complaintStatusTone[c.status]}>{c.status}</Pill>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {c.engineer}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{c.created}</td>
                    <td className="px-4 py-3.5">
                      <div className="w-[110px]">
                        <Meter
                          value={c.progress}
                          tone={c.progress === 100 ? "success" : "primary"}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================= Complaint details ============================= */

export function ComplaintDetails({ id }: { id: string }) {
  const { item: liveComplaint, loading: complaintLoading } = useComplaintRecord(id);

  const complaint = useMemo(() => {
    if (!apiEnabled || !liveComplaint) return complaintById(id);
    const c = liveComplaint;
    let staffStatus: StaffComplaint["status"] = "Submitted";
    if (c.status === "OPEN") staffStatus = "Submitted";
    else if (c.status === "ASSIGNED") staffStatus = "Assigned";
    else if (c.status === "MAINTENANCE_IN_PROGRESS") staffStatus = "In Progress";
    else if (c.status === "AWAITING_PARTS") staffStatus = "Awaiting Parts";
    else if (c.status === "RESOLVED") staffStatus = "Resolved";
    else if (c.status === "CLOSED") staffStatus = "Closed";

    const eqId =
      typeof c.equipmentId === "object" && c.equipmentId
        ? c.equipmentId.equipmentId
        : String(c.equipmentId || "");

    return {
      id: c.complaintId || c._id,
      title: c.title,
      equipmentId: eqId,
      category: "Software" as const,
      priority: (c.priority === "CRITICAL"
        ? "Critical"
        : c.priority === "HIGH"
          ? "High"
          : c.priority === "LOW"
            ? "Low"
            : "Medium") as StaffComplaint["priority"],
      description: c.description,
      status: staffStatus,
      progress: c.status === "RESOLVED" || c.status === "CLOSED" ? 100 : 30,
      engineer:
        typeof c.assignedEngineerId === "object" && c.assignedEngineerId
          ? c.assignedEngineerId.name
          : "Unassigned",
      reportedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
      created: new Date(c.createdAt).toLocaleDateString(),
      updated: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
      expected: "1 working day",
      raisedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
      contact:
        typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.email || "Staff" : "Staff",
      stage:
        c.status === "OPEN" ? "Submitted" : c.status === "ASSIGNED" ? "Scheduled" : "In Progress",
      parts: [],
      remarks: c.resolution || "",
      notes: [],
      messages: [],
      photos: [],
      attachments: [],
      symptoms: c.description.includes("Symptoms:")
        ? c.description
            .split("Symptoms:")[1]
            .split(",")
            .map((s: string) => s.trim())
        : [],
      timeline: [],
      reportId: c.workOrderId ? String(c.workOrderId) : undefined,
    };
  }, [liveComplaint]);

  const asset = useMemo(() => {
    if (!complaint) return null;
    const found = equipmentById(complaint.equipmentId);
    if (found) return found;
    if (liveComplaint && typeof liveComplaint.equipmentId === "object" && liveComplaint.equipmentId) {
      const eq = liveComplaint.equipmentId as any;
      return {
        id: eq.equipmentId || complaint.equipmentId || "EQ-1001",
        name: eq.name || "Hamilton C6 ICU Ventilator",
        category: eq.category || "Critical Care",
        location: eq.location || "ICU · Bed 1",
        health: eq.healthScore ?? 100,
        status: eq.status || "Operational",
      };
    }
    return {
      id: complaint.equipmentId || "EQ-1001",
      name: "Hamilton C6 ICU Ventilator",
      category: "Critical Care",
      location: "ICU · Bed 1",
      health: 100,
      status: "Operational",
    };
  }, [complaint, liveComplaint]);

  const engineer = useMemo(() => {
    if (!complaint) return null;
    return deptEngineers.find((e) => e.name === complaint.engineer) ?? deptEngineers[0]!;
  }, [complaint]);

  const work = useMemo(() => {
    if (!complaint) return null;
    return staffMaintenance.find((m) => m.complaintId === complaint.id);
  }, [complaint]);

  const report = useMemo(() => {
    if (!complaint || !complaint.reportId) return null;
    return reportById(complaint.reportId);
  }, [complaint]);

  if (apiEnabled && complaintLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading complaint details…
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <StaffCrumbs trail={[{ label: "Complaints", to: "/staff/complaints" }, { label: id }]} />
        <Panel>
          <EmptyState
            icon={<CircleAlert className="size-6" />}
            title="Complaint not found"
            hint="It may have been merged or belongs to another department."
            action={
              <ActionLink to="/staff/complaints" variant="primary">
                Back to complaints
              </ActionLink>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs
        trail={[{ label: "Complaints", to: "/staff/complaints" }, { label: complaint.id }]}
      />
      <StaffHero
        eyebrow={`${complaint.category} · ${complaint.priority} priority`}
        title={complaint.title}
        description={`${complaint.id} · raised by ${complaint.raisedBy} on ${complaint.created} · expected ${complaint.expected}`}
        actions={
          <>
            {report ? (
              <ActionLink
                to={`/staff/reports/${report.id}` as never}
                variant="primary"
                icon={<Download className="size-4" />}
              >
                Download report
              </ActionLink>
            ) : null}
            {work ? (
              <ActionLink
                to={`/staff/maintenance/${work.id}` as never}
                icon={<Wrench className="size-4" />}
              >
                Maintenance progress
              </ActionLink>
            ) : null}
            <ActionLink to="/staff/department" icon={<Phone className="size-4" />}>
              Contact engineer
            </ActionLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Complaint information"
            subtitle="Reported details"
            icon={<ClipboardList className="size-4" />}
          />
          <div className="px-6 pb-6 sm:px-7">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {complaint.description}
            </p>
            <div className="mt-4">
              <TagPills items={complaint.symptoms} tone="primary" />
            </div>
            <div className="mt-5 grid gap-x-8 md:grid-cols-2">
              <dl>
                <DefRow label="Complaint ID" value={complaint.id} />
                <DefRow label="Category" value={complaint.category} />
                <DefRow
                  label="Priority"
                  value={<Pill tone={priorityTone[complaint.priority]}>{complaint.priority}</Pill>}
                />
                <DefRow
                  label="Status"
                  value={
                    <Pill tone={complaintStatusTone[complaint.status]}>{complaint.status}</Pill>
                  }
                />
              </dl>
              <dl>
                <DefRow label="Raised by" value={`${complaint.raisedBy} · ${complaint.contact}`} />
                <DefRow label="Created" value={complaint.created} />
                <DefRow label="Last update" value={complaint.updated} />
                <DefRow label="Expected completion" value={complaint.expected} />
              </dl>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Current status"
            subtitle={complaint.stage}
            icon={<Activity className="size-4" />}
          />
          <div className="flex flex-col items-center gap-4 px-6 pb-7">
            <Ring value={complaint.progress} size={124} sub="complete" />
            <div className="w-full rounded-2xl bg-surface-muted/70 p-4">
              <p className="text-[12px] font-semibold">Engineer remarks</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {complaint.remarks}
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Equipment"
            subtitle="Affected asset"
            icon={<Cpu className="size-4" />}
          />
          <div className="px-6 pb-6 sm:px-7">
            <dl>
              <DefRow label="Asset" value={asset?.name ?? "—"} />
              <DefRow label="Asset ID" value={complaint.equipmentId} />
              <DefRow label="Location" value={asset?.location ?? "—"} />
              <DefRow label="Health" value={`${asset?.health ?? 0}%`} />
            </dl>
            <div className="mt-4">
              <ActionLink
                to={`/staff/equipment/${complaint.equipmentId}` as never}
                variant="primary"
              >
                Open equipment details
              </ActionLink>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Assigned engineer"
            subtitle="Biomedical contact"
            icon={<UserRound className="size-4" />}
          />
          <div className="px-6 pb-7 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl gradient-primary text-[13px] font-bold text-white">
                {engineer.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold">{engineer.name}</p>
                <p className="text-[11.5px] text-muted-foreground">{engineer.role}</p>
              </div>
            </div>
            <dl className="mt-3">
              <DefRow label="Phone" value={engineer.phone} />
              <DefRow label="Email" value={engineer.email} />
              <DefRow label="Coverage" value={engineer.zone} />
            </dl>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Complaint timeline"
            subtitle="Full audit trail"
            icon={<Activity className="size-4" />}
          />
          <StaffTimeline items={complaint.timeline} />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Engineer notes"
            subtitle="Technical updates from site"
            icon={<FileText className="size-4" />}
          />
          <ul className="space-y-3 px-6 pb-7 sm:px-7">
            {complaint.notes.map((n) => (
              <li key={n.when} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-semibold">{n.who}</p>
                  <span className="text-[11px] text-muted-foreground">{n.when}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {n.text}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Maintenance progress"
            subtitle="Linked work order"
            icon={<Wrench className="size-4" />}
          />
          {work ? (
            <div className="px-6 pb-7 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to={`/staff/maintenance/${work.id}` as never}
                  className="text-[13px] font-semibold hover:text-primary"
                >
                  {work.id}
                </Link>
                <Pill tone={maintenanceStatusTone[work.status]}>{work.status}</Pill>
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {work.stage} · expected {work.expected}
              </p>
              <div className="mt-3">
                <Meter value={work.progress} />
              </div>
              <ul className="mt-4 space-y-2">
                {work.steps.map((s) => (
                  <li key={s.label} className="flex items-start gap-2.5 text-[12.5px]">
                    <CheckCircle2
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        s.done ? "text-success" : "text-muted-foreground/40",
                      )}
                    />
                    <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={<Wrench className="size-6" />}
              title="No work order yet"
              hint="A work order appears once an engineer starts on site."
            />
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Communication history"
            subtitle="Messages with the biomedical team"
            icon={<MessageSquare className="size-4" />}
          />
          <div className="space-y-3 px-6 pb-6 sm:px-7">
            {complaint.messages.map((m, i) => (
              <div key={i} className={cn("flex", m.self ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    m.self ? "gradient-primary text-white" : "border border-border bg-surface",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      m.self ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {m.who} · {m.when}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-6 py-4 sm:px-7">
            <input
              placeholder="Write a message to the engineer…"
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs outline-none focus:border-primary"
            />
            <ActionButton variant="primary" icon={<Send className="size-4" />}>
              Send
            </ActionButton>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Uploaded images"
            subtitle="Photos from site"
            icon={<Images className="size-4" />}
          />
          <div className="grid grid-cols-2 gap-3 px-6 pb-7 sm:px-7">
            {complaint.photos.map((p) => (
              <div key={p.label} className="overflow-hidden rounded-2xl border border-border">
                <div className="grid h-[92px] place-items-center bg-surface-muted/70">
                  <Camera className="size-7 text-muted-foreground/60" />
                </div>
                <div className="p-3">
                  <p className="truncate text-[11.5px] font-medium">{p.label}</p>
                  <p className="text-[10.5px] text-muted-foreground">{p.when}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Documents"
            subtitle="Attachments on this complaint"
            icon={<Paperclip className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7">
            {complaint.attachments.map((a) => (
              <li
                key={a.name}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{a.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{a.size}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Service report"
            subtitle="Issued after completion"
            icon={<FileText className="size-4" />}
          />
          {report ? (
            <div className="px-6 pb-7 sm:px-7">
              <dl>
                <DefRow label="Report ID" value={report.id} />
                <DefRow label="Engineer" value={report.engineer} />
                <DefRow label="Completed" value={report.completed} />
                <DefRow label="Outcome" value={<Pill tone="success">{report.outcome}</Pill>} />
                <DefRow label="Summary" value={report.summary} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionLink to={`/staff/reports/${report.id}` as never} variant="primary">
                  View full report
                </ActionLink>
                <ActionButton icon={<Download className="size-4" />}>Download PDF</ActionButton>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="size-6" />}
              title="Report not issued yet"
              hint="The service report becomes available once the engineer completes and signs off the work."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================= Maintenance status ============================ */

export function MaintenanceStatusList() {
  const live = useMaintenanceList();
  const list = apiEnabled && live.records ? live.records : staffMaintenance;
  const active = list.filter((m) => m.status !== "Completed");
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Maintenance status" }]} />
      <StaffHero
        eyebrow="Maintenance"
        title="Maintenance status"
        description="Live progress on every work order touching your department, with stages, parts and expected completion."
        actions={
          <ActionLink
            to="/staff/complaints"
            variant="primary"
            icon={<CircleAlert className="size-4" />}
          >
            Related complaints
          </ActionLink>
        }
      />
      <StaffTabs active="maintenance" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active work orders"
          value={active.length}
          hint="In progress or waiting"
          tone="primary"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Awaiting parts"
          value={list.filter((m) => m.status === "Awaiting Parts").length}
          hint="Vendor dependency"
          tone="warning"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Scheduled"
          value={list.filter((m) => m.status === "Scheduled").length}
          hint="Planned visits"
          tone="violet"
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Avg progress"
          value={`${Math.round(list.reduce((a, m) => a + m.progress, 0) / list.length)}%`}
          hint="Across all work orders"
          tone="success"
          icon={<Activity className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {list.map((m) => {
          const eq = equipmentById(m.equipmentId);
          return (
            <Panel key={m.id}>
              <PanelHead
                title={`${m.id} · ${eq?.name ?? ""}`}
                subtitle={`${m.type} · ${m.stage} · ${m.engineer}`}
                icon={<Wrench className="size-4" />}
                action={<Pill tone={maintenanceStatusTone[m.status]}>{m.status}</Pill>}
              />
              <div className="px-6 pb-6 sm:px-7">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold tabular-nums">{m.progress}%</span>
                </div>
                <div className="mt-1.5">
                  <Meter
                    value={m.progress}
                    tone={m.status === "Awaiting Parts" ? "warning" : "primary"}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  {m.remarks}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-2xl bg-surface-muted/70 py-3">
                    <p className="text-[12.5px] font-bold">{m.started}</p>
                    <p className="text-[10.5px] text-muted-foreground">Started</p>
                  </div>
                  <div className="rounded-2xl bg-surface-muted/70 py-3">
                    <p className="text-[12.5px] font-bold">{m.expected}</p>
                    <p className="text-[10.5px] text-muted-foreground">Expected completion</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ActionLink to={`/staff/maintenance/${m.id}` as never} variant="primary">
                    View maintenance detail
                  </ActionLink>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function MaintenanceStatusDetails({ id }: { id: string }) {
  const live = useMaintenanceRecord(id);
  const work = apiEnabled && live.record ? live.record : maintenanceById(id);
  const timeline =
    apiEnabled && live.record
      ? live.history.map((h) => ({
          when: new Date(h.timestamp).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          who: h.userName ?? "System",
          what: h.description ?? h.action,
          tone: (h.newStatus === "COMPLETED" ? "success" : "primary") as Tone,
        }))
      : (maintenanceById(id)?.timeline ?? []);

  if (!work) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <StaffCrumbs trail={[{ label: "Maintenance", to: "/staff/maintenance" }, { label: id }]} />
        <Panel>
          <EmptyState
            icon={<Wrench className="size-6" />}
            title="Work order not found"
            hint="This work order is not linked to your department."
            action={
              <ActionLink to="/staff/maintenance" variant="primary">
                Back to maintenance
              </ActionLink>
            }
          />
        </Panel>
      </div>
    );
  }

  const eq = equipmentById(work.equipmentId);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs
        trail={[{ label: "Maintenance", to: "/staff/maintenance" }, { label: work.id }]}
      />
      <StaffHero
        eyebrow={`${work.type} · ${work.stage}`}
        title={`${work.id} — ${eq?.name ?? ""}`}
        description={`Engineer ${work.engineer} · started ${work.started} · expected completion ${work.expected}`}
        actions={
          <>
            <ActionLink
              to={`/staff/equipment/${work.equipmentId}` as never}
              variant="primary"
              icon={<Cpu className="size-4" />}
            >
              Equipment details
            </ActionLink>
            {work.complaintId ? (
              <ActionLink
                to={`/staff/complaints/${work.complaintId}` as never}
                icon={<CircleAlert className="size-4" />}
              >
                {work.complaintId}
              </ActionLink>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHead
            title="Current stage"
            subtitle={work.stage}
            icon={<Activity className="size-4" />}
          />
          <div className="flex flex-col items-center gap-4 px-6 pb-7">
            <Ring value={work.progress} size={124} sub="complete" />
            <Pill tone={maintenanceStatusTone[work.status]}>{work.status}</Pill>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Work order detail"
            subtitle="Assignment and schedule"
            icon={<Wrench className="size-4" />}
          />
          <div className="grid gap-x-8 px-6 pb-6 sm:px-7 md:grid-cols-2">
            <dl>
              <DefRow label="Work order" value={work.id} />
              <DefRow label="Equipment" value={eq?.name ?? "—"} />
              <DefRow label="Location" value={eq?.location ?? "—"} />
              <DefRow label="Engineer" value={work.engineer} />
            </dl>
            <dl>
              <DefRow label="Type" value={work.type} />
              <DefRow label="Started" value={work.started} />
              <DefRow label="Expected completion" value={work.expected} />
              <DefRow label="Linked complaint" value={work.complaintId ?? "—"} />
            </dl>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Progress steps"
            subtitle="Stage by stage"
            icon={<ClipboardList className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7 sm:px-7">
            {work.steps.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    s.done ? "text-success" : "text-muted-foreground/40",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[12.5px]",
                    s.done ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                <Pill tone={s.done ? "success" : "neutral"}>{s.done ? "Done" : "Pending"}</Pill>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Parts replaced"
            subtitle="Components used"
            icon={<Cpu className="size-4" />}
          />
          {work.parts.length === 0 ? (
            <EmptyState
              icon={<Cpu className="size-6" />}
              title="No parts used"
              hint="This visit does not require replacement components."
            />
          ) : (
            <ul className="space-y-2.5 px-6 pb-7">
              {work.parts.map((p) => (
                <li key={p.code} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold">{p.part}</span>
                    <Pill tone={p.status.includes("order") ? "warning" : "success"}>
                      {p.status}
                    </Pill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.code} · qty {p.qty}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title="Maintenance images"
            subtitle="Captured on site"
            icon={<Images className="size-4" />}
          />
          {work.images.length === 0 ? (
            <EmptyState
              icon={<Camera className="size-6" />}
              title="No images yet"
              hint="Photos appear as the engineer uploads evidence."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 px-6 pb-7 sm:px-7">
              {work.images.map((im) => (
                <div key={im.label} className="overflow-hidden rounded-2xl border border-border">
                  <div className="grid h-[92px] place-items-center bg-surface-muted/70">
                    <Camera className="size-7 text-muted-foreground/60" />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[11.5px] font-medium">{im.label}</p>
                    <p className="text-[10.5px] text-muted-foreground">{im.when}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Maintenance timeline"
            subtitle="Everything logged so far"
            icon={<Activity className="size-4" />}
          />
          <StaffTimeline items={timeline} />
          <div className="border-t border-border px-6 py-4 sm:px-7">
            <p className="text-[12px] font-semibold">Remarks</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {work.remarks}
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
