import React, { useState } from "react";
import {
  CalendarDays,
  Building2,
  Check,
  ChevronDown,
  Filter,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  UserRound,
  Wrench,
  X,
  ShieldAlert,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AnalyticsFilterState,
  DatePreset,
} from "@/lib/analyticsFilterEngine";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  dateRangeLabel: string;
  activeFilterCount: number;
  activePills: {
    key: keyof AnalyticsFilterState;
    label: string;
    value: string;
    onRemove: () => void;
  }[];
  onFilterChange: (key: keyof AnalyticsFilterState, value: string | undefined) => void;
  onDatePresetChange: (preset: DatePreset, from?: string, to?: string) => void;
  onClearAll: () => void;
  onRemoveFilter: (key: keyof AnalyticsFilterState) => void;

  // Filter visibility toggles for the page
  showDateRange?: boolean;
  showDepartment?: boolean;
  showStatus?: boolean;
  showCategory?: boolean;
  showPriority?: boolean;
  showCriticality?: boolean;
  showMaintenanceType?: boolean;
  showEngineer?: boolean;
  showVendor?: boolean;
  showRole?: boolean;
  showSearch?: boolean;

  // Dynamic option lists
  departments?: { id: string; name: string }[];
  statuses?: string[];
  categories?: string[];
  priorities?: string[];
  criticalities?: string[];
  maintenanceTypes?: string[];
  engineers?: { id?: string; name: string }[];
  vendors?: string[];
  roles?: string[];

  // Dataset counts
  totalCount?: number;
  filteredCount?: number;
  className?: string;
}

const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "this-quarter", label: "This Quarter" },
  { id: "this-year", label: "This Year" },
  { id: "custom", label: "Custom Range…" },
];

const DEFAULT_DEPARTMENTS = [
  "Radiology",
  "ICU",
  "Operating Theatre",
  "Emergency",
  "Laboratory",
  "Cardiology",
  "Oncology",
  "Biomedical Engineering",
];

const DEFAULT_STATUSES = [
  "Operational",
  "Under Maintenance",
  "Critical",
  "Idle",
  "Active",
  "Scheduled",
  "Completed",
  "In Progress",
  "Resolved",
  "Closed",
];

const DEFAULT_CATEGORIES = [
  "Imaging",
  "Life Support",
  "Surgical",
  "Diagnostics",
  "Monitoring",
  "Laboratory",
  "Therapeutic",
];

const DEFAULT_PRIORITIES = ["Critical", "High", "Medium", "Low"];
const DEFAULT_CRITICALITIES = ["High", "Critical", "Medium", "Low"];
const DEFAULT_TYPES = ["Preventive", "Corrective", "Calibration", "Emergency"];
const DEFAULT_ENGINEERS = [
  "Anita Raghavan",
  "Daniel Okafor",
  "Mei Lin Chan",
  "Tomás Herrera",
  "Priya Nair",
];
const DEFAULT_VENDORS = [
  "Siemens Healthineers",
  "GE Healthcare",
  "Philips",
  "Mindray",
  "Stryker",
  "Baxter",
  "Dräger",
];
const DEFAULT_ROLES = [
  "ADMIN",
  "BIOMEDICAL_ENGINEER",
  "DEPARTMENT_STAFF",
  "SUPER_ADMIN",
];

export function AnalyticsFilterBar({
  filters,
  dateRangeLabel,
  activeFilterCount,
  activePills,
  onFilterChange,
  onDatePresetChange,
  onClearAll,
  onRemoveFilter,
  showDateRange = true,
  showDepartment = true,
  showStatus = true,
  showCategory = true,
  showPriority = false,
  showCriticality = false,
  showMaintenanceType = false,
  showEngineer = false,
  showVendor = false,
  showRole = false,
  showSearch = true,
  departments,
  statuses,
  categories,
  priorities,
  criticalities,
  maintenanceTypes,
  engineers,
  vendors,
  roles,
  totalCount,
  filteredCount,
  className,
}: AnalyticsFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(filters.dateFrom || "");
  const [customTo, setCustomTo] = useState(filters.dateTo || "");

  // Options normalization
  const deptList = (departments && departments.length > 0
    ? departments.map((d) => d.name)
    : DEFAULT_DEPARTMENTS
  ).filter((v, i, a) => a.indexOf(v) === i);

  const statusList = (statuses && statuses.length > 0 ? statuses : DEFAULT_STATUSES).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const catList = (categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const priorityList = (priorities && priorities.length > 0
    ? priorities
    : DEFAULT_PRIORITIES
  ).filter((v, i, a) => a.indexOf(v) === i);
  const critList = (criticalities && criticalities.length > 0
    ? criticalities
    : DEFAULT_CRITICALITIES
  ).filter((v, i, a) => a.indexOf(v) === i);
  const typeList = (maintenanceTypes && maintenanceTypes.length > 0
    ? maintenanceTypes
    : DEFAULT_TYPES
  ).filter((v, i, a) => a.indexOf(v) === i);
  const engList = (engineers && engineers.length > 0
    ? engineers.map((e) => e.name)
    : DEFAULT_ENGINEERS
  ).filter((v, i, a) => a.indexOf(v) === i);
  const vendorList = (vendors && vendors.length > 0 ? vendors : DEFAULT_VENDORS).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const roleList = (roles && roles.length > 0 ? roles : DEFAULT_ROLES).filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  // Check if any secondary filter is enabled to display the "More Filters" button
  const hasMoreFilters =
    showPriority ||
    showCriticality ||
    showMaintenanceType ||
    showEngineer ||
    showVendor ||
    showRole;

  const moreFiltersActiveCount = [
    showPriority && filters.priority,
    showCriticality && filters.criticality,
    showMaintenanceType && filters.maintenanceType,
    showEngineer && (filters.engineerName || filters.engineerId),
    showVendor && filters.vendor,
    showRole && filters.role,
  ].filter(Boolean).length;

  const handleApplyCustomDate = () => {
    if (customFrom || customTo) {
      onDatePresetChange("custom", customFrom || undefined, customTo || undefined);
      setCustomRangeOpen(false);
    }
  };

  return (
    <div
      data-no-export="true"
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xs transition-all duration-200",
        className,
      )}
    >
      {/* Top Mobile Bar Toggle */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs"
        >
          <Filter className="size-3.5 text-primary" />
          <span>Filters</span>
          {activeFilterCount > 0 ? (
            <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn("size-3.5 transition-transform", mobileOpen && "rotate-180")}
          />
        </button>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors"
          >
            <RotateCcw className="size-3" /> Clear
          </button>
        ) : null}
      </div>

      {/* Main Filter Controls Row */}
      <div
        className={cn(
          "grid gap-2 sm:flex sm:flex-wrap sm:items-center",
          !mobileOpen && "hidden sm:flex",
        )}
      >
        {/* Date Range Selector */}
        {showDateRange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center justify-between gap-2 rounded-xl border px-3 text-[12.5px] font-medium transition-all shadow-xs",
                  filters.datePreset !== "30d" && filters.datePreset !== "all"
                    ? "border-primary/40 bg-primary-soft text-primary font-semibold"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[130px]">{dateRangeLabel}</span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-1.5 z-50">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Date Presets
              </div>
              {DATE_PRESET_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  onSelect={() => {
                    if (opt.id === "custom") {
                      setCustomRangeOpen(true);
                    } else {
                      onDatePresetChange(opt.id);
                    }
                  }}
                  onClick={() => {
                    if (opt.id === "custom") {
                      setCustomRangeOpen(true);
                    } else {
                      onDatePresetChange(opt.id);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                    filters.datePreset === opt.id && "bg-primary-soft text-primary font-semibold",
                  )}
                >
                  <span>{opt.label}</span>
                  {filters.datePreset === opt.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Custom Date Range Popover */}
        <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
          <PopoverTrigger asChild>
            <span className="hidden" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-4 space-y-3 z-50">
            <div className="text-xs font-semibold text-foreground">Custom Date Range</div>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">From Date</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">To Date</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomRangeOpen(false)}
                className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDate}
                className="rounded-lg gradient-primary px-3 py-1 text-xs font-semibold text-white shadow-xs"
              >
                Apply Range
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Department Filter */}
        {showDepartment && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center justify-between gap-2 rounded-xl border px-3 text-[12.5px] font-medium transition-all shadow-xs",
                  filters.departmentName || filters.departmentId
                    ? "border-primary/40 bg-primary-soft text-primary font-semibold"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[130px]">
                  {filters.departmentName || filters.departmentId || "All Departments"}
                </span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-1.5 max-h-72 overflow-y-auto z-50">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Departments
              </div>
              <DropdownMenuItem
                onSelect={() => {
                  onFilterChange("departmentName", undefined);
                  onFilterChange("departmentId", undefined);
                }}
                onClick={() => {
                  onFilterChange("departmentName", undefined);
                  onFilterChange("departmentId", undefined);
                }}
                className={cn(
                  "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                  !filters.departmentName && !filters.departmentId && "bg-primary-soft text-primary font-semibold",
                )}
              >
                <span>All Departments</span>
                {!filters.departmentName && !filters.departmentId ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {deptList.map((dept) => (
                <DropdownMenuItem
                  key={dept}
                  onSelect={() => {
                    onFilterChange("departmentName", dept);
                    const matched = departments?.find((d) => d.name === dept);
                    onFilterChange("departmentId", matched?.id || dept);
                  }}
                  onClick={() => {
                    onFilterChange("departmentName", dept);
                    const matched = departments?.find((d) => d.name === dept);
                    onFilterChange("departmentId", matched?.id || dept);
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                    (filters.departmentName === dept || filters.departmentId === dept) &&
                      "bg-primary-soft text-primary font-semibold",
                  )}
                >
                  <span className="truncate">{dept}</span>
                  {filters.departmentName === dept || filters.departmentId === dept ? (
                    <Check className="size-3.5" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Status Filter */}
        {showStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center justify-between gap-2 rounded-xl border px-3 text-[12.5px] font-medium transition-all shadow-xs",
                  filters.status
                    ? "border-primary/40 bg-primary-soft text-primary font-semibold"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                <Tag className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[120px]">{filters.status || "All Statuses"}</span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-1.5 max-h-72 overflow-y-auto z-50">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </div>
              <DropdownMenuItem
                onSelect={() => onFilterChange("status", undefined)}
                onClick={() => onFilterChange("status", undefined)}
                className={cn(
                  "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                  !filters.status && "bg-primary-soft text-primary font-semibold",
                )}
              >
                <span>All Statuses</span>
                {!filters.status ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {statusList.map((st) => (
                <DropdownMenuItem
                  key={st}
                  onSelect={() => onFilterChange("status", st)}
                  onClick={() => onFilterChange("status", st)}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                    filters.status === st && "bg-primary-soft text-primary font-semibold",
                  )}
                >
                  <span>{st}</span>
                  {filters.status === st ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category Filter */}
        {showCategory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center justify-between gap-2 rounded-xl border px-3 text-[12.5px] font-medium transition-all shadow-xs",
                  filters.category
                    ? "border-primary/40 bg-primary-soft text-primary font-semibold"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                <Layers className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[120px]">
                  {filters.category || "All Categories"}
                </span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-1.5 max-h-72 overflow-y-auto z-50">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </div>
              <DropdownMenuItem
                onSelect={() => onFilterChange("category", undefined)}
                onClick={() => onFilterChange("category", undefined)}
                className={cn(
                  "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                  !filters.category && "bg-primary-soft text-primary font-semibold",
                )}
              >
                <span>All Categories</span>
                {!filters.category ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {catList.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onSelect={() => onFilterChange("category", cat)}
                  onClick={() => onFilterChange("category", cat)}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-1.5",
                    filters.category === cat && "bg-primary-soft text-primary font-semibold",
                  )}
                >
                  <span>{cat}</span>
                  {filters.category === cat ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* More Filters Popover for Secondary Criteria */}
        {hasMoreFilters && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-medium transition-all shadow-xs",
                  moreFiltersActiveCount > 0
                    ? "border-primary/40 bg-primary-soft text-primary font-semibold"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <span>More Filters</span>
                {moreFiltersActiveCount > 0 ? (
                  <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {moreFiltersActiveCount}
                  </span>
                ) : (
                  <ChevronDown className="size-3 text-muted-foreground opacity-70" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-4 space-y-3.5 z-50">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Advanced Filters</span>
                {moreFiltersActiveCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (showPriority) onFilterChange("priority", undefined);
                      if (showCriticality) onFilterChange("criticality", undefined);
                      if (showMaintenanceType) onFilterChange("maintenanceType", undefined);
                      if (showEngineer) {
                        onFilterChange("engineerName", undefined);
                        onFilterChange("engineerId", undefined);
                      }
                      if (showVendor) onFilterChange("vendor", undefined);
                      if (showRole) onFilterChange("role", undefined);
                    }}
                    className="text-[11px] font-medium text-danger hover:underline"
                  >
                    Reset advanced
                  </button>
                ) : null}
              </div>

              {/* Priority */}
              {showPriority && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Priority</label>
                  <select
                    value={filters.priority || "all"}
                    onChange={(e) => onFilterChange("priority", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Priorities</option>
                    {priorityList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Criticality */}
              {showCriticality && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Criticality
                  </label>
                  <select
                    value={filters.criticality || "all"}
                    onChange={(e) => onFilterChange("criticality", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Criticalities</option>
                    {critList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Maintenance Type */}
              {showMaintenanceType && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Maintenance Type
                  </label>
                  <select
                    value={filters.maintenanceType || "all"}
                    onChange={(e) => onFilterChange("maintenanceType", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Maintenance Types</option>
                    {typeList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assigned Engineer */}
              {showEngineer && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Assigned Engineer
                  </label>
                  <select
                    value={filters.engineerName || filters.engineerId || "all"}
                    onChange={(e) => {
                      onFilterChange("engineerName", e.target.value);
                      onFilterChange("engineerId", e.target.value);
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Engineers</option>
                    {engList.map((eng) => (
                      <option key={eng} value={eng}>
                        {eng}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vendor */}
              {showVendor && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Vendor</label>
                  <select
                    value={filters.vendor || "all"}
                    onChange={(e) => onFilterChange("vendor", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Vendors</option>
                    {vendorList.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role */}
              {showRole && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">User Role</label>
                  <select
                    value={filters.role || "all"}
                    onChange={(e) => onFilterChange("role", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="all">All Roles</option>
                    {roleList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Quick Search Input */}
        {showSearch && (
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filters.query || ""}
              onChange={(e) => onFilterChange("query", e.target.value)}
              placeholder="Search records…"
              className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-7 text-[12.5px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-xs"
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => onFilterChange("query", undefined)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        )}

        {/* Clear All Button */}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-transparent px-3 text-[12px] font-semibold text-muted-foreground transition-all hover:border-danger/30 hover:bg-danger-soft hover:text-danger ml-auto sm:ml-0"
            title="Reset all filters to default"
          >
            <RotateCcw className="size-3" />
            <span>Clear All</span>
          </button>
        ) : null}
      </div>

      {/* Active Filter Chips / Pills Row */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Active:
          </span>
          {activePills.map((pill) => (
            <span
              key={`${pill.key}-${pill.value}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft/60 px-2.5 py-0.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-primary-soft"
            >
              <span className="text-muted-foreground">{pill.label}:</span>
              <span className="font-semibold text-primary truncate max-w-[120px]">
                {pill.value}
              </span>
              <button
                type="button"
                onClick={pill.onRemove}
                className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                title={`Remove ${pill.label} filter`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          {/* Records summary counter on right */}
          {filteredCount !== undefined ? (
            <span className="ml-auto text-[11.5px] font-medium text-muted-foreground tabular-nums">
              Showing{" "}
              <strong className="text-foreground">{filteredCount.toLocaleString()}</strong>
              {totalCount !== undefined ? ` of ${totalCount.toLocaleString()}` : ""} records
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Standard enterprise EmptyState when filter results in 0 matches
 */
export function EmptyFilterState({
  title = "No data found for the selected filters",
  description = "No records match your active criteria. Try broadening your date range or clearing specific filter tags.",
  onClear,
}: {
  title?: string;
  description?: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-muted/40 p-12 text-center animate-in fade-in-50">
      <div className="grid size-14 place-items-center rounded-2xl bg-surface border border-border shadow-soft text-muted-foreground">
        <Filter className="size-6 text-primary" />
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
        >
          <RotateCcw className="size-3.5" /> Clear all filters
        </button>
      ) : null}
    </div>
  );
}
