import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Cpu,
  Plus,
  Search,
  Wrench,
  ShieldCheck,
  CircleAlert,
  Download,
  PencilLine,
  History,
  X,
  Check,
  Loader2,
  ArrowUpRight,
  Unlink,
  Link2,
  Filter,
  CheckCircle2,
  Boxes,
  Mail,
  Phone,
  Layers,
  Sparkles,
  ClipboardList,
  Users,
  UserPlus,
  UserMinus,
  Shield,
  UserCheck,
} from "lucide-react";
import { ModuleDetails, Breadcrumbs, ActionButton } from "@/components/workflow/pages";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { useDepartmentRecord } from "@/lib/api/useDepartments";
import { equipmentApi } from "@/lib/api/equipmentApi";
import { departmentsApi } from "@/lib/api/departmentsApi";
import { usersApi } from "@/lib/api/usersApi";
import { apiEnabled } from "@/lib/api/client";
import { usePdfExport, generateReportFilename } from "@/lib/exportPdf";
import type { ApiEquipment, ApiUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/departments/$id/")({
  head: () => ({
    meta: [
      { title: "Department Details — Medixa" },
      {
        name: "description",
        content: "Full department profile, mapped equipment assets, and operational status.",
      },
      { property: "og:title", content: "Department Details — Medixa" },
      {
        property: "og:description",
        content: "Full department profile, mapped equipment assets, and operational status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsDetailsRoute,
});

function DepartmentsDetailsRoute() {
  const { id } = Route.useParams();
  const live = useDepartmentRecord(id);

  if (!live.enabled || !live.detail?.department) {
    return (
      <ModuleDetails
        moduleKey="departments"
        id={id}
        record={live.record}
        loading={live.loading}
        error={live.error}
      />
    );
  }

  return (
    <DepartmentDetailsView
      id={id}
      live={live}
    />
  );
}

interface DepartmentDetailsViewProps {
  id: string;
  live: ReturnType<typeof useDepartmentRecord>;
}

function DepartmentDetailsView({ id, live }: DepartmentDetailsViewProps) {
  const { department, detail, reload } = live;
  const { exporting, handleExport } = usePdfExport();

  // Search & filter for mapped equipment table
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Map equipment modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [allEquipment, setAllEquipment] = useState<ApiEquipment[]>([]);
  const [loadingAllEquip, setLoadingAllEquip] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mappingInProgress, setMappingInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mappedEquipment = detail?.equipment ?? [];

  // Filter mapped equipment
  const filteredMapped = useMemo(() => {
    return mappedEquipment.filter((eq) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        eq.name.toLowerCase().includes(q) ||
        eq.equipmentId.toLowerCase().includes(q) ||
        (eq.model && eq.model.toLowerCase().includes(q)) ||
        (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q));

      const matchesCat = categoryFilter === "ALL" || eq.category === categoryFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OPERATIONAL" && (eq.status === "ACTIVE" || eq.status === "OPERATIONAL")) ||
        (statusFilter === "MAINTENANCE" && eq.status === "UNDER_MAINTENANCE") ||
        (statusFilter === "CRITICAL" && (eq.status === "UNDER_BREAKDOWN" || eq.status === "OUT_OF_SERVICE"));

      return matchesQ && matchesCat && matchesStatus;
    });
  }, [mappedEquipment, searchQuery, categoryFilter, statusFilter]);

  // Load all equipment when modal opens
  useEffect(() => {
    if (isMapModalOpen) {
      setLoadingAllEquip(true);
      equipmentApi
        .list({ limit: 300 })
        .then((res) => setAllEquipment(res.items || []))
        .catch(() => setAllEquipment([]))
        .finally(() => setLoadingAllEquip(false));
    } else {
      setSelectedIds([]);
      setModalSearch("");
    }
  }, [isMapModalOpen]);

  // Filter equipment in modal
  const selectableEquipment = useMemo(() => {
    const currentDeptId = department?._id;
    return allEquipment.filter((eq) => {
      // Don't show assets already mapped to this department
      const eqDeptId = typeof eq.departmentId === "object" ? eq.departmentId?._id : eq.departmentId;
      if (eqDeptId && currentDeptId && String(eqDeptId) === String(currentDeptId)) {
        return false;
      }
      if (unassignedOnly && eqDeptId) {
        return false;
      }
      if (modalSearch.trim()) {
        const q = modalSearch.trim().toLowerCase();
        return (
          eq.name.toLowerCase().includes(q) ||
          eq.equipmentId.toLowerCase().includes(q) ||
          (eq.model && eq.model.toLowerCase().includes(q)) ||
          (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allEquipment, department?._id, unassignedOnly, modalSearch]);

  // Toggle selection in modal
  const toggleSelect = (eqId: string) => {
    setSelectedIds((prev) =>
      prev.includes(eqId) ? prev.filter((i) => i !== eqId) : [...prev, eqId],
    );
  };

  const selectAllSelectable = () => {
    if (selectedIds.length === selectableEquipment.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableEquipment.map((e) => e._id || e.equipmentId));
    }
  };

  // Perform mapping
  const handleMapSubmit = async () => {
    if (!department || selectedIds.length === 0) return;
    setMappingInProgress(true);
    setActionMessage(null);

    try {
      // Try dedicated department endpoint
      try {
        await departmentsApi.mapEquipment(department._id, selectedIds);
      } catch {
        // Fallback: update individual equipment directly
        await Promise.all(
          selectedIds.map((idToMap) =>
            equipmentApi.update(idToMap, { departmentId: department._id }),
          ),
        );
      }

      setActionMessage({
        type: "success",
        text: `Successfully mapped ${selectedIds.length} asset${selectedIds.length > 1 ? "s" : ""} to ${department.name}.`,
      });
      setIsMapModalOpen(false);
      reload();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to map equipment to this department.",
      });
    } finally {
      setMappingInProgress(false);
    }
  };

  // Unmap an equipment asset
  const handleUnmap = async (eq: ApiEquipment) => {
    if (!department) return;
    if (
      !window.confirm(
        `Are you sure you want to unmap "${eq.name} (${eq.equipmentId})" from ${department.name}?`,
      )
    ) {
      return;
    }

    try {
      const eqId = eq._id || eq.equipmentId;
      try {
        await departmentsApi.unmapEquipment(department._id, [eqId]);
      } catch {
        await equipmentApi.update(eqId, { departmentId: null as unknown as string });
      }

      setActionMessage({
        type: "success",
        text: `Unmapped ${eq.name} from ${department.name}.`,
      });
      reload();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to unmap equipment.",
      });
    }
  };

  // Mapped staff
  const mappedStaff = detail?.staff ?? [];
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const filteredStaff = useMemo(() => {
    return mappedStaff.filter((u) => {
      const q = staffSearchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    });
  }, [mappedStaff, staffSearchQuery]);

  // Assign user modal state
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [userModalSearch, setUserModalSearch] = useState("");
  const [unassignedUsersOnly, setUnassignedUsersOnly] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignRole, setAssignRole] = useState("DEPARTMENT_STAFF");
  const [assigningInProgress, setAssigningInProgress] = useState(false);

  useEffect(() => {
    if (isAssignUserModalOpen) {
      setLoadingAllUsers(true);
      usersApi
        .list({ limit: 150 })
        .then((res) => setAllUsers(res.items || []))
        .catch(() => setAllUsers([]))
        .finally(() => setLoadingAllUsers(false));
    } else {
      setSelectedUserIds([]);
      setUserModalSearch("");
    }
  }, [isAssignUserModalOpen]);

  const selectableUsers = useMemo(() => {
    const currentDeptId = department?._id;
    return allUsers.filter((u) => {
      const uDeptId = typeof u.departmentId === "object" ? u.departmentId?._id : u.departmentId;
      if (uDeptId && currentDeptId && String(uDeptId) === String(currentDeptId)) {
        return false;
      }
      if (unassignedUsersOnly && uDeptId) {
        return false;
      }
      if (userModalSearch.trim()) {
        const q = userModalSearch.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
          (u.title && u.title.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allUsers, department?._id, unassignedUsersOnly, userModalSearch]);

  const toggleUserSelect = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid],
    );
  };

  const selectAllSelectableUsers = () => {
    if (selectedUserIds.length === selectableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map((u) => u._id));
    }
  };

  const handleAssignUserSubmit = async () => {
    if (!department || selectedUserIds.length === 0) return;
    setAssigningInProgress(true);
    setActionMessage(null);

    try {
      const roleParam = assignRole === "KEEP_EXISTING" ? undefined : assignRole;
      try {
        await departmentsApi.mapStaff(department._id, selectedUserIds, roleParam);
      } catch {
        await Promise.all(
          selectedUserIds.map((uId) =>
            usersApi.update(uId, {
              departmentId: department._id,
              ...(roleParam ? { role: roleParam as never } : {}),
            }),
          ),
        );
      }

      setActionMessage({
        type: "success",
        text: `Successfully assigned ${selectedUserIds.length} user${selectedUserIds.length > 1 ? "s" : ""} to ${department.name}.`,
      });
      setIsAssignUserModalOpen(false);
      reload();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to assign user(s) to this department.",
      });
    } finally {
      setAssigningInProgress(false);
    }
  };

  const handleUnassignUser = async (u: ApiUser) => {
    if (!department) return;
    if (
      !window.confirm(
        `Are you sure you want to unassign "${u.name}" (${u.email}) from ${department.name}?`,
      )
    ) {
      return;
    }

    try {
      try {
        await departmentsApi.unmapStaff(department._id, [u._id]);
      } catch {
        await usersApi.update(u._id, { departmentId: null as unknown as string });
      }

      setActionMessage({
        type: "success",
        text: `Unassigned ${u.name} from ${department.name}.`,
      });
      reload();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to unassign user.",
      });
    }
  };

  if (!department) return null;

  const operationalCount = mappedEquipment.filter(
    (e) => e.status === "ACTIVE" || e.status === "OPERATIONAL",
  ).length;
  const maintenanceCount = mappedEquipment.filter(
    (e) => e.status === "UNDER_MAINTENANCE" || e.status === "AWAITING_PARTS",
  ).length;
  const breakdownCount = mappedEquipment.filter(
    (e) => e.status === "UNDER_BREAKDOWN" || e.status === "OUT_OF_SERVICE",
  ).length;
  const openComplaintsCount = (detail?.complaints ?? []).filter(
    (c) => c.status !== "CLOSED" && c.status !== "RESOLVED",
  ).length;

  const healthScore =
    mappedEquipment.length > 0
      ? Math.round(
          mappedEquipment.reduce((acc, curr) => acc + (curr.healthScore ?? 100), 0) /
            mappedEquipment.length,
        )
      : 100;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        moduleKey="departments"
        trail={[{ label: "Register", to: "/departments/list" }, { label: department.name }]}
      />

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-sm transition-all animate-in fade-in",
            actionMessage.type === "success"
              ? "border-success/30 bg-success-soft text-success"
              : "border-danger/30 bg-danger-soft text-danger",
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <CircleAlert className="size-4 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={department.active !== false ? "success" : "neutral"}>
                {department.active !== false ? "Active Department" : "Inactive"}
              </Pill>
              <Pill tone="primary">Code: {department.code}</Pill>
              <Pill tone="neutral">
                {[department.building, department.floor].filter(Boolean).join(" · ") ||
                  "Main Facility"}
              </Pill>
            </div>
            <h1 className="mt-3 text-[32px] font-bold leading-tight">{department.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {department.description ||
                `Clinical department led by ${department.headName || "department leadership"} with ${mappedEquipment.length} mapped medical asset${mappedEquipment.length !== 1 ? "s" : ""}.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <ActionButton
                variant="ghost"
                icon={exporting ? Loader2 : Download}
                disabled={exporting}
                onClick={() => {
                  const filename = generateReportFilename("Department-Report", department.code);
                  void handleExport({
                    filename,
                    title: `Department Report: ${department.name}`,
                    subtitle: `Code: ${department.code} · ${mappedEquipment.length} Assets Registered`,
                    metadata: {
                      "Department Code": department.code,
                      "Head of Department": department.headName || "—",
                      Building: department.building || "—",
                      Floor: department.floor || "—",
                      "Mapped Assets": String(mappedEquipment.length),
                      "Health Score": `${healthScore}%`,
                    },
                  });
                }}
              >
                {exporting ? "Exporting..." : "Export PDF"}
              </ActionButton>
              <ActionButton
                to={`/departments/${department.code || department._id}/edit` as never}
                icon={PencilLine}
              >
                Edit Department
              </ActionButton>
              <ActionButton
                variant="ghost"
                to={`/departments/${department.code || department._id}/history` as never}
                icon={History}
              >
                History
              </ActionButton>
              <ActionButton
                icon={Plus}
                to={`/equipment/new?dept=${encodeURIComponent(department.name)}&departmentId=${department._id}` as never}
              >
                Register Asset
              </ActionButton>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-surface-muted"
              >
                <Link2 className="size-4 text-primary" /> Map Equipment
              </button>
              <button
                type="button"
                onClick={() => setIsAssignUserModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[12.5px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <UserPlus className="size-4" /> Assign Staff
              </button>
            </div>
          </div>
          <div className="self-center">
            <Ring value={healthScore} size={118} sub="Estate Health" />
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Panel interactive={false} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Equipment
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {mappedEquipment.length}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Assets mapped</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Cpu className="size-5" />
            </span>
          </div>
        </Panel>

        <Panel interactive={false} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                Assigned Staff
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {mappedStaff.length}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Active personnel</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
          </div>
        </Panel>

        <Panel interactive={false} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                Operational
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {operationalCount}
              </p>
              <p className="mt-1 text-[11px] text-success">Active & In Service</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck className="size-5" />
            </span>
          </div>
        </Panel>

        <Panel interactive={false} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                Maintenance & Issues
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {maintenanceCount + breakdownCount}
              </p>
              <p className="mt-1 text-[11px] text-warning">
                {breakdownCount > 0 ? `${breakdownCount} critical breakdown` : "Under maintenance"}
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-warning-soft text-warning">
              <Wrench className="size-5" />
            </span>
          </div>
        </Panel>

        <Panel interactive={false} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                Open Complaints
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {openComplaintsCount}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Awaiting resolution</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-danger-soft text-danger">
              <CircleAlert className="size-5" />
            </span>
          </div>
        </Panel>
      </div>

      {/* MAPPED EQUIPMENT SECTION */}
      <Panel interactive={false}>
        <PanelHead
          title="Mapped Equipment"
          subtitle={`All clinical assets assigned and operating under ${department.name}`}
          icon={<Cpu className="size-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <Link2 className="size-3.5" /> Map Existing Equipment
              </button>
              <Link
                to="/equipment/new"
                search={{ dept: department.name, departmentId: department._id }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-surface-muted"
              >
                <Plus className="size-3.5" /> Register New Asset
              </Link>
            </div>
          }
        />

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3 sm:px-7">
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mapped equipment by name, ID, model..."
              className="w-full rounded-xl border border-border bg-surface-muted/50 py-1.5 pl-9 pr-3 text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary"
            >
              <option value="ALL">All Categories</option>
              <option value="Imaging">Imaging</option>
              <option value="Life Support">Life Support</option>
              <option value="Surgical">Surgical</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Monitoring">Monitoring</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CRITICAL">Critical / Breakdown</option>
            </select>
          </div>
        </div>

        {/* Equipment Table / Empty State */}
        {filteredMapped.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 sm:px-7">Asset ID</th>
                  <th className="px-4 py-3">Asset Details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health Score</th>
                  <th className="px-4 py-3">Location & Serial</th>
                  <th className="px-6 py-3 text-right sm:px-7">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13px]">
                {filteredMapped.map((eq) => {
                  const isOp = eq.status === "ACTIVE" || eq.status === "OPERATIONAL";
                  const isCrit = eq.status === "UNDER_BREAKDOWN" || eq.status === "OUT_OF_SERVICE";
                  const statusTone = isCrit ? "danger" : isOp ? "success" : "warning";
                  const statusLabel = isCrit
                    ? "Breakdown"
                    : isOp
                      ? "Operational"
                      : "Maintenance";

                  return (
                    <tr key={eq.equipmentId} className="transition-colors hover:bg-surface-muted/50">
                      <td className="whitespace-nowrap px-6 py-3.5 sm:px-7">
                        <Link
                          to={`/equipment/${eq.equipmentId || eq._id}` as never}
                          className="font-mono text-[12.5px] font-semibold text-primary hover:underline"
                        >
                          {eq.equipmentId}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">{eq.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {[eq.model, eq.manufacturer || eq.vendor].filter(Boolean).join(" · ") ||
                            "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Pill tone="neutral">{eq.category}</Pill>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Pill tone={statusTone}>{statusLabel}</Pill>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Meter value={eq.healthScore ?? 100} tone={statusTone} />
                          <span className="font-semibold text-[12px] tabular-nums">
                            {eq.healthScore ?? 100}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                        <p className="text-[12.5px]">{eq.location || "Department Room"}</p>
                        <p className="text-[11px]">{eq.serialNumber || "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right sm:px-7">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/equipment/${eq.equipmentId || eq._id}` as never}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                            title="View Asset Details"
                          >
                            <ArrowUpRight className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleUnmap(eq)}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger hover:border-danger/30"
                            title="Unmap from Department"
                          >
                            <Unlink className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
              <Cpu className="size-6" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "No equipment matching filters"
                : "No equipment mapped to this department yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try clearing your search query or filters to see all mapped assets."
                : `You can map existing hospital assets to ${department.name} or register a new piece of equipment.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <Link2 className="size-4" /> Map Existing Equipment
              </button>
              <Link
                to="/equipment/new"
                search={{ dept: department.name, departmentId: department._id }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-muted"
              >
                <Plus className="size-4" /> Register New Asset
              </Link>
            </div>
          </div>
        )}
      </Panel>

      {/* ASSIGNED STAFF & USERS SECTION */}
      <Panel interactive={false}>
        <PanelHead
          title="Assigned Department Staff & Personnel"
          subtitle={`Clinical personnel, biomedical technicians, and nurses with access to ${department.name}`}
          icon={<Users className="size-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAssignUserModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <UserPlus className="size-3.5" /> Assign Existing User
              </button>
            </div>
          }
        />

        {/* Search for assigned staff if staff exist */}
        {mappedStaff.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3 sm:px-7">
            <div className="relative min-w-[260px] max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Search assigned staff by name, email, employee ID..."
                className="w-full rounded-xl border border-border bg-surface-muted/50 py-1.5 pl-9 pr-3 text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredStaff.length} user{filteredStaff.length !== 1 ? "s" : ""} assigned
            </span>
          </div>
        )}

        {/* Staff Table / Empty State */}
        {filteredStaff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 sm:px-7">User</th>
                  <th className="px-4 py-3">Email & Contact</th>
                  <th className="px-4 py-3">Role & Access Level</th>
                  <th className="px-4 py-3">Title / Position</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right sm:px-7">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b border-border text-[13px]">
                {filteredStaff.map((u) => {
                  const roleLabel =
                    u.role === "DEPARTMENT_STAFF"
                      ? "Department Staff"
                      : u.role === "BIOMEDICAL_ENGINEER"
                        ? "Biomedical Engineer"
                        : u.role === "TECHNICIAN"
                          ? "Technician"
                          : "Administrator";

                  const roleTone =
                    u.role === "DEPARTMENT_STAFF"
                      ? "primary"
                      : u.role === "BIOMEDICAL_ENGINEER"
                        ? "violet"
                        : u.role === "TECHNICIAN"
                          ? "warning"
                          : "neutral";

                  const initials =
                    u.initials ||
                    u.name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  return (
                    <tr key={u._id} className="transition-colors hover:bg-surface-muted/50">
                      <td className="whitespace-nowrap px-6 py-3.5 sm:px-7">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                            {initials}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-[11.5px] font-mono text-muted-foreground">
                              {u.employeeId || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-medium text-foreground">{u.email}</p>
                        <p className="text-[11.5px] text-muted-foreground">{u.phone || "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Pill tone={roleTone as never}>{roleLabel}</Pill>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {u.role === "DEPARTMENT_STAFF"
                            ? "Staff Portal & Scoped Directory"
                            : "Engineering & Maintenance"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                        <p className="text-[12.5px] font-medium text-foreground">
                          {u.title || "Clinical Staff"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Pill tone={u.status === "ACTIVE" ? "success" : "neutral"}>
                          {u.status || "ACTIVE"}
                        </Pill>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right sm:px-7">
                        <button
                          type="button"
                          onClick={() => void handleUnassignUser(u)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger hover:border-danger/30"
                          title="Unassign from Department"
                        >
                          <UserMinus className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
              <Users className="size-6" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {staffSearchQuery
                ? "No staff matching search query"
                : "No users assigned to this department yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {staffSearchQuery
                ? "Try clearing your search query to see all assigned staff members."
                : `Assign existing hospital staff or nurses to ${department.name} so they can log into the staff portal, view equipment, and submit maintenance tickets.`}
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setIsAssignUserModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <UserPlus className="size-4" /> Assign Existing User
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* DEPARTMENT SPECIFICATIONS & DETAILS */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" interactive={false}>
          <PanelHead
            title="Department Information"
            subtitle="Facility master data and operational contacts"
            icon={<ClipboardList className="size-4" />}
          />
          <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2 sm:px-7">
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Department Code
              </dt>
              <dd className="mt-1 font-mono text-[14px] font-bold text-foreground">
                {department.code}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Head of Department
              </dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-foreground">
                {department.headName || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Building & Wing
              </dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-foreground">
                {department.building || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Floor</dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-foreground">
                {department.floor || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Contact Email
              </dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-foreground">
                {department.contactEmail || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Contact Phone
              </dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-foreground">
                {department.contactPhone || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3.5 sm:col-span-2">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Department Overview
              </dt>
              <dd className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                {department.description || "No specific overview provided for this department."}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel interactive={false}>
          <PanelHead
            title="Operational Overview"
            subtitle="Activity and status"
            icon={<Building2 className="size-4" />}
          />
          <div className="space-y-4 px-6 pb-6 text-sm">
            <div className="rounded-2xl bg-surface-muted/60 p-4">
              <p className="text-xs font-semibold text-foreground">Registered Assets</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                {mappedEquipment.length}
              </p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {operationalCount} fully operational · {maintenanceCount + breakdownCount} attention required
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Operational Availability</span>
                <span className="font-semibold text-foreground">{healthScore}%</span>
              </div>
              <Meter value={healthScore} tone={healthScore >= 80 ? "success" : "warning"} />
            </div>

            <div className="pt-2">
              <Link
                to="/departments/list"
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[12.5px] font-medium transition-all hover:bg-surface-muted"
              >
                <span>View all departments</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </Panel>
      </div>

      {/* MAP EQUIPMENT MODAL */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-border bg-surface shadow-float">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Link2 className="size-4" />
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    Map Equipment to {department.name}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select medical devices from the register to assign to {department.name} ({department.code}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Search and Filter Controls */}
            <div className="border-b border-border bg-surface-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search by equipment ID, name, model..."
                    className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={unassignedOnly}
                    onChange={(e) => setUnassignedOnly(e.target.checked)}
                    className="size-4 rounded text-primary focus:ring-primary"
                  />
                  Unassigned equipment only
                </label>
                <button
                  type="button"
                  onClick={selectAllSelectable}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  {selectedIds.length === selectableEquipment.length && selectableEquipment.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
            </div>

            {/* Modal Equipment List */}
            <div className="max-h-[380px] overflow-y-auto p-4 divide-y divide-border">
              {loadingAllEquip ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-5 animate-spin" /> Loading hospital equipment register...
                </div>
              ) : selectableEquipment.length > 0 ? (
                selectableEquipment.map((eq) => {
                  const isSelected = selectedIds.includes(eq._id || eq.equipmentId);
                  const currentDept =
                    typeof eq.departmentId === "object" && eq.departmentId
                      ? eq.departmentId.name
                      : eq.departmentId
                        ? String(eq.departmentId)
                        : "Unassigned";

                  return (
                    <div
                      key={eq.equipmentId}
                      onClick={() => toggleSelect(eq._id || eq.equipmentId)}
                      className={cn(
                        "flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary-soft/50 border border-primary/30"
                          : "hover:bg-surface-muted/60",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(eq._id || eq.equipmentId)}
                          className="size-4 rounded text-primary"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {eq.equipmentId}
                            </span>
                            <span className="truncate font-semibold text-sm text-foreground">
                              {eq.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {[eq.model, eq.category, eq.serialNumber].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Pill tone={currentDept === "Unassigned" ? "neutral" : "primary"}>
                          {currentDept}
                        </Pill>
                        <Pill
                          tone={
                            eq.status === "ACTIVE" || eq.status === "OPERATIONAL"
                              ? "success"
                              : "warning"
                          }
                        >
                          {eq.status}
                        </Pill>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No matching equipment found to map.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border p-4 bg-surface-muted/20">
              <span className="text-xs text-muted-foreground font-medium">
                {selectedIds.length} asset{selectedIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(false)}
                  disabled={mappingInProgress}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMapSubmit}
                  disabled={selectedIds.length === 0 || mappingInProgress}
                  className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow disabled:opacity-50 transition-transform hover:-translate-y-0.5"
                >
                  {mappingInProgress ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Mapping...
                    </>
                  ) : (
                    <>
                      <Link2 className="size-3.5" /> Map Selected ({selectedIds.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN USERS MODAL */}
      {isAssignUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-border bg-surface shadow-float">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                    <UserPlus className="size-4" />
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    Assign Users to {department.name}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select existing hospital users to assign to {department.name} ({department.code}). Assigned users will have access to this department's equipment and portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignUserModalOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Search and Filters */}
            <div className="border-b border-border bg-surface-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={userModalSearch}
                    onChange={(e) => setUserModalSearch(e.target.value)}
                    placeholder="Search by name, email, employee ID, role..."
                    className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={unassignedUsersOnly}
                    onChange={(e) => setUnassignedUsersOnly(e.target.checked)}
                    className="size-4 rounded text-primary focus:ring-primary"
                  />
                  Unassigned users only
                </label>
                <button
                  type="button"
                  onClick={selectAllSelectableUsers}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  {selectedUserIds.length === selectableUsers.length && selectableUsers.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {/* Role Selection Option */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Assign Role:
                  </span>
                  <select
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value)}
                    className="rounded-xl border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground outline-none focus:border-primary"
                  >
                    <option value="DEPARTMENT_STAFF">
                      DEPARTMENT_STAFF (Grants Staff Portal & Directory Access)
                    </option>
                    <option value="BIOMEDICAL_ENGINEER">BIOMEDICAL_ENGINEER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                    <option value="KEEP_EXISTING">Keep each user's current role</option>
                  </select>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Department Staff users are scoped to this department's equipment.
                </span>
              </div>
            </div>

            {/* Modal Users List */}
            <div className="max-h-[360px] overflow-y-auto p-4 divide-y divide-border">
              {loadingAllUsers ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-5 animate-spin" /> Loading hospital users directory...
                </div>
              ) : selectableUsers.length > 0 ? (
                selectableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  const currentDeptName =
                    typeof u.departmentId === "object" && u.departmentId
                      ? u.departmentId.name
                      : u.departmentId
                        ? "Assigned"
                        : "Unassigned";

                  const initials =
                    u.initials ||
                    u.name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleUserSelect(u._id)}
                      className={cn(
                        "flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary-soft/50 border border-primary/30"
                          : "hover:bg-surface-muted/60",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelect(u._id)}
                          className="size-4 rounded text-primary"
                        />
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-sm text-foreground">
                              {u.name}
                            </span>
                            {u.employeeId && (
                              <span className="font-mono text-xs text-muted-foreground">
                                ({u.employeeId})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email} {u.title ? `· ${u.title}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Pill tone={currentDeptName === "Unassigned" ? "neutral" : "primary"}>
                          {currentDeptName}
                        </Pill>
                        <Pill tone="neutral">{u.role}</Pill>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No eligible users found matching your search.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border p-4 bg-surface-muted/20">
              <span className="text-xs text-muted-foreground font-medium">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignUserModalOpen(false)}
                  disabled={assigningInProgress}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignUserSubmit}
                  disabled={selectedUserIds.length === 0 || assigningInProgress}
                  className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow disabled:opacity-50 transition-transform hover:-translate-y-0.5"
                >
                  {assigningInProgress ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3.5" /> Assign Selected ({selectedUserIds.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
