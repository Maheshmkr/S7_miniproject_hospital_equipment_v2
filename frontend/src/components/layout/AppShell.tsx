import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  ClipboardCheck,
  Bell,
  BriefcaseMedical,
  Building2,
  CalendarDays,
  ChevronRight,
  Command as CommandIcon,
  CircleAlert,
  Cpu,
  Gauge,
  HardHat,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/primitives";
import { notifications as mockNotifications } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/api/useNotifications";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  children?: { label: string; to: string }[];
};

const workflow = (base: string, singular: string) => [
  { label: "Register", to: `${base}/list` },
  { label: `New ${singular}`, to: `${base}/new` },
  { label: "Analytics", to: `${base}/analytics` },
];
type NavSection = { section: string; items: NavItem[] };

const adminNav: NavSection[] = [
  { section: "Overview", items: [{ label: "Command Center", to: "/", icon: LayoutGrid }] },
  {
    section: "Assets",
    items: [
      {
        label: "Equipment",
        to: "/equipment",
        icon: Cpu,
        badge: "2.4k",
        children: workflow("/equipment", "asset"),
      },
      {
        label: "Warranty & AMC",
        to: "/warranty",
        icon: ShieldCheck,
        children: workflow("/warranty", "contract"),
      },
      {
        label: "Vendors",
        to: "/vendors",
        icon: Truck,
        children: workflow("/vendors", "vendor"),
      },
      {
        label: "Purchase Orders",
        to: "/purchase-orders",
        icon: ReceiptText,
        children: workflow("/purchase-orders", "purchase order"),
      },
      {
        label: "Inventory",
        to: "/inventory",
        icon: Boxes,
        children: workflow("/inventory", "item"),
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        label: "Complaints",
        to: "/complaints",
        icon: CircleAlert,
        badge: "37",
        children: workflow("/complaints", "ticket"),
      },
      {
        label: "Maintenance",
        to: "/maintenance",
        icon: Wrench,
        children: workflow("/maintenance", "work order"),
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        label: "Departments",
        to: "/departments",
        icon: Building2,
        children: workflow("/departments", "department"),
      },
    ],
  },

  {
    section: "Governance",
    items: [
      {
        label: "Audits",
        to: "/audits",
        icon: ClipboardCheck,
        children: [
          { label: "Templates", to: "/audits/templates" },
          { label: "Assign audit", to: "/audits/assign" },
          { label: "Audit history", to: "/audits/history" },
        ],
      },
    ],
  },
  {
    section: "Analytics",
    items: [{ label: "Executive Analytics", to: "/analytics", icon: Gauge }],
  },
  {
    section: "Administration",
    items: [
      { label: "User Management", to: "/users", icon: Users, children: workflow("/users", "user") },
    ],
  },
];

const engineerNav: NavSection[] = [
  {
    section: "Field service",
    items: [
      { label: "My Workspace", to: "/engineer", icon: HardHat },
      { label: "Assigned tasks", to: "/engineer/tasks", icon: Wrench, badge: "5" },
      { label: "Calendar", to: "/engineer/calendar", icon: CalendarDays },
      { label: "History", to: "/engineer/history", icon: Activity },
      { label: "My audits", to: "/audits", icon: ClipboardCheck },
    ],
  },
  {
    section: "Me",
    items: [
      { label: "Performance", to: "/engineer/performance", icon: Gauge },
      { label: "Profile", to: "/engineer/profile", icon: Users },
      { label: "Field settings", to: "/engineer/settings", icon: Settings },
    ],
  },
];

const staffNav: NavSection[] = [
  {
    section: "My department",
    items: [
      { label: "Dashboard", to: "/staff", icon: LayoutGrid },
      { label: "Equipment", to: "/staff/equipment", icon: Cpu },
      { label: "Complaints", to: "/staff/complaints", icon: CircleAlert, badge: "3" },
      { label: "Maintenance", to: "/staff/maintenance", icon: Wrench },
      { label: "Service reports", to: "/staff/reports", icon: ShieldCheck },
    ],
  },
  {
    section: "Me",
    items: [
      { label: "Department profile", to: "/staff/department", icon: Building2 },
      { label: "Notifications", to: "/staff/notifications", icon: Bell },
      { label: "My profile", to: "/staff/profile", icon: Users },
      { label: "Settings", to: "/staff/settings", icon: Settings },
    ],
  },
];

const staffQuickActions = [
  { label: "Register a complaint", to: "/staff/complaints/new" },
  { label: "View department equipment", to: "/staff/equipment" },
  { label: "Track complaint status", to: "/staff/complaints" },
  { label: "Maintenance progress", to: "/staff/maintenance" },
  { label: "Service reports", to: "/staff/reports" },
];

const technicianNav: NavSection[] = [
  {
    section: "Inventory Control",
    items: [
      {
        label: "Inventory register",
        to: "/inventory",
        icon: Boxes,
        children: workflow("/inventory", "item"),
      },
      {
        label: "Purchase orders",
        to: "/purchase-orders",
        icon: ReceiptText,
        children: workflow("/purchase-orders", "purchase order"),
      },
    ],
  },
  {
    section: "Me",
    items: [
      { label: "My profile", to: "/staff/profile", icon: Users },
      { label: "Settings", to: "/staff/settings", icon: Settings },
    ],
  },
];

const technicianQuickActions = [
  { label: "Receive stock", to: "/inventory" },
  { label: "Issue stock", to: "/inventory" },
  { label: "Raise purchase order", to: "/purchase-orders/new" },
];

const adminQuickActions = [
  { label: "Register new equipment", to: "/equipment/new" },
  { label: "Raise a complaint", to: "/complaints/new" },
  { label: "Schedule maintenance", to: "/maintenance/new" },
  { label: "Invite a user", to: "/users/new" },
  { label: "Add AMC contract", to: "/warranty/new" },
  { label: "Add a vendor", to: "/vendors/new" },
  { label: "Raise a purchase order", to: "/purchase-orders/new" },
  { label: "Executive analytics", to: "/analytics" },
];

const engineerQuickActions = [
  { label: "My assigned tasks", to: "/engineer/tasks" },
  { label: "Engineer calendar", to: "/engineer/calendar" },
  { label: "Maintenance history", to: "/engineer/history" },
  { label: "My performance", to: "/engineer/performance" },
];

function useNav() {
  const { user } = useAuth();
  if (user?.role === "engineer")
    return { sections: engineerNav, quickActions: engineerQuickActions };
  if (user?.role === "staff") return { sections: staffNav, quickActions: staffQuickActions };
  if (user?.role === "technician")
    return { sections: technicianNav, quickActions: technicianQuickActions };
  return { sections: adminNav, quickActions: adminQuickActions };
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  return (
    <Link to={user?.home ?? "/"} className="flex items-center gap-3 px-3 py-1">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl gradient-primary shadow-glow">
        <BriefcaseMedical className="size-5 text-white" strokeWidth={2.2} />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold tracking-tight text-foreground">
            Medixa
          </span>
          <span className="block truncate text-[11px] font-medium text-muted-foreground">
            Asset Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { sections } = useNav();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex",
        collapsed ? "w-[84px]" : "w-[272px]",
      )}
    >
      <div className="flex h-[76px] items-center justify-between px-3">
        <Brand collapsed={collapsed} />
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mb-2 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.section}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      title={item.label}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                        strokeWidth={2}
                      />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                    {active && !collapsed && item.children ? (
                      <ul className="mt-1 space-y-0.5 border-l border-sidebar-border pl-4 ml-5">
                        {item.children.map((c) => (
                          <li key={c.to}>
                            <Link
                              to={c.to}
                              className={cn(
                                "block rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                                pathname === c.to
                                  ? "bg-sidebar-accent text-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="rounded-2xl gradient-primary p-4 text-white shadow-glow">
            <Sparkles className="size-4" />
            <p className="mt-2 text-[13px] font-semibold leading-snug">Medixa Copilot</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/80">
              3 assets are trending toward failure this week.
            </p>
            <button className="mt-3 w-full rounded-xl bg-white/15 px-3 py-2 text-[12px] font-semibold backdrop-blur transition-colors hover:bg-white/25">
              Review insights
            </button>
          </div>
        )}
        {[
          { label: "Support", icon: LifeBuoy },
          { label: "Settings", icon: Settings },
        ].map((i) => (
          <button
            key={i.label}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <i.icon className="size-[18px] shrink-0" />
            {!collapsed && i.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function NotificationPanel() {
  const live = useNotifications();
  const navigate = useNavigate();

  const tones: Record<string, string> = {
    danger: "bg-danger",
    DANGER: "bg-danger",
    warning: "bg-warning",
    WARNING: "bg-warning",
    info: "bg-primary",
    INFO: "bg-primary",
    success: "bg-success",
    SUCCESS: "bg-success",
  };

  const items =
    live.enabled && live.notifications.length > 0
      ? live.notifications
      : mockNotifications.map((m, idx) => ({
          _id: `mock-${idx}`,
          id: `mock-${idx}`,
          title: m.title,
          message: m.meta,
          severity: m.tone.toUpperCase() as "INFO" | "WARNING" | "DANGER" | "SUCCESS",
          link: "",
          isRead: false,
          createdAt: new Date().toISOString(),
        }));

  const unreadCount = live.enabled ? live.unreadCount : 4;

  const handleClick = (n: { _id?: string; link?: string }) => {
    if (n._id && live.enabled) {
      void live.markRead(n._id);
    }
    if (n.link) {
      void navigate({ to: n.link });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-soft"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] rounded-2xl border-border p-0 shadow-lift">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <Pill tone="primary">{unreadCount} new</Pill>
          ) : (
            <Pill tone="neutral">All caught up</Pill>
          )}
        </div>
        <ul className="max-h-[340px] overflow-y-auto border-t border-border">
          {items.map((n) => (
            <li
              key={n._id || n.title}
              onClick={() => handleClick(n)}
              className={cn(
                "flex cursor-pointer gap-3 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-surface-muted",
                n.isRead && "opacity-70",
              )}
            >
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", tones[n.severity || "info"])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug text-foreground">{n.title}</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{n.message}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-3">
          <button
            onClick={() => void live.markAllRead()}
            className="w-full rounded-xl bg-surface-muted py-2 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Mark all as read
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-xl border border-border bg-surface py-1.5 pl-1.5 pr-3 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <span className="grid size-7 place-items-center rounded-lg gradient-primary text-[11px] font-bold text-white">
            {user?.initials ?? "—"}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[12.5px] font-semibold leading-tight">
              {user?.name ?? "Guest"}
            </span>
            <span className="block text-[10.5px] leading-tight text-muted-foreground">
              {user?.title ?? ""}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-lift">
        <DropdownMenuLabel className="px-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          Account
        </DropdownMenuLabel>
        {(user?.role === "engineer"
          ? ["Profile", "Field settings", "My performance"]
          : user?.role === "staff"
            ? ["My profile", "Notifications", "Department profile"]
            : ["Profile", "Preferences", "Workspace settings", "Audit log"]
        ).map((l) => (
          <DropdownMenuItem key={l} className="rounded-lg px-3 py-2 text-[13px]">
            {l}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="rounded-lg px-3 py-2 text-[13px] text-danger focus:text-danger"
        >
          <LogOut className="size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { sections } = useNav();
  const items = sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));
  const current = items.find((i) => (i.to === "/" ? pathname === "/" : pathname.startsWith(i.to)));

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <nav className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground md:flex">
            <span>{current?.section ?? "Overview"}</span>
            <ChevronRight className="size-3.5" />
            <span className="truncate font-semibold text-foreground">
              {current?.label ?? "Command Center"}
            </span>
          </nav>
          <button
            onClick={onOpenSearch}
            className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-left text-[13px] text-muted-foreground shadow-xs transition-all hover:border-border-strong hover:shadow-soft md:max-w-[380px]"
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Search assets, tickets, people…</span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold sm:flex">
              <CommandIcon className="size-3" />K
            </kbd>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[12px] font-medium text-muted-foreground xl:flex">
            <span className="size-2 rounded-full bg-success live-dot" />
            All systems operational
          </span>
          <NotificationPanel />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const { sections, quickActions } = useNav();
  const searchItems = sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSearch={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-6 pb-16 pt-8 lg:px-8">{children}</main>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a workspace, asset or ticket…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Workspaces">
            {searchItems.map((i) => (
              <CommandItem key={i.to} value={i.label} onSelect={() => setOpen(false)} asChild>
                <Link to={i.to} className="flex items-center gap-3">
                  <i.icon className="size-4 text-muted-foreground" />
                  {i.label}
                  <span className="ml-auto text-[11px] text-muted-foreground">{i.section}</span>
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Quick actions">
            {quickActions.map((a) => (
              <CommandItem key={a.to} value={a.label} onSelect={() => setOpen(false)} asChild>
                <Link to={a.to} className="flex items-center gap-3">
                  <Activity className="size-4 text-muted-foreground" />
                  {a.label}
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
