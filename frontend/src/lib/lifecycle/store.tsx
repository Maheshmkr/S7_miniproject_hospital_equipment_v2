import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { seedState } from "./seed";
import {
  actions,
  buildChecklist,
  resolveChecklistQuestions,
  withResolvedChecklists,
} from "./repository";
import type { Actor, ChecklistItem, LifecycleState, MaintenanceType } from "./types";

const KEY = "medixa.lifecycle.v2";

type Mutator = (state: LifecycleState, actor: Actor) => LifecycleState;

type LifecycleValue = {
  state: LifecycleState;
  actor: Actor;
  /** Run a repository action. Swap the body for an API call when the backend lands. */
  run: (mutator: Mutator) => void;
  reset: () => void;
};

const Ctx = createContext<LifecycleValue | null>(null);

export function LifecycleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<LifecycleState>(() => withResolvedChecklists(seedState()));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as LifecycleState;
      const fresh = seedState();
      // Configuration added after the cache was written is merged back in.
      setState(
        withResolvedChecklists({
          ...cached,
          checklistTemplates: cached.checklistTemplates?.length
            ? cached.checklistTemplates
            : fresh.checklistTemplates,
          checklistQuestions: cached.checklistQuestions?.length
            ? cached.checklistQuestions
            : fresh.checklistQuestions,
        }),
      );
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state]);

  const actor = useMemo<Actor>(
    () => ({ name: user?.name ?? "Medixa", role: user?.role ?? "admin" }),
    [user],
  );

  const run = useCallback((mutator: Mutator) => setState((prev) => mutator(prev, actor)), [actor]);

  const reset = useCallback(() => setState(withResolvedChecklists(seedState())), []);

  const value = useMemo(() => ({ state, actor, run, reset }), [state, actor, run, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLifecycle() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLifecycle must be used inside LifecycleProvider");
  return ctx;
}

/* -------------------------------- Selectors ---------------------------------- */

/** Administrator view of the checklist configuration for one asset. */
export function useChecklistConfig(equipmentId: string) {
  const { state } = useLifecycle();
  return useMemo(() => {
    const asset = state.equipment.find(
      (e) => e.id === equipmentId || (e as any).equipmentId === equipmentId,
    );
    const templates = (state.checklistTemplates ?? []).filter(
      (t) => t.category?.toLowerCase() === asset?.category?.toLowerCase(),
    );
    const all = (state.checklistQuestions ?? []).filter(
      (q) => !asset?.category || q.category?.toLowerCase() === asset.category.toLowerCase(),
    );
    return {
      asset,
      templates,
      categoryQuestions: all.filter((q) => !q.equipmentId).sort((a, b) => a.order - b.order),
      equipmentQuestions: all
        .filter((q) => q.equipmentId === equipmentId || (asset && q.equipmentId === asset.id))
        .sort((a, b) => a.order - b.order),
      resolved: resolveChecklistQuestions(state, equipmentId),
    };
  }, [state, equipmentId]);
}

/** Engineer view: configured questions merged with recorded answers. */
export function useResolvedChecklist(
  equipmentId: string,
  type?: MaintenanceType,
  existing: ChecklistItem[] = [],
) {
  const { state } = useLifecycle();
  return useMemo(
    () => buildChecklist(state, equipmentId, type, existing),
    [state, equipmentId, type, existing],
  );
}

export function useEquipmentDossier(equipmentId: string) {
  const { state } = useLifecycle();
  return useMemo(() => {
    const asset = state.equipment.find((e) => e.id === equipmentId);
    const complaints = state.complaints.filter((c) => c.equipmentId === equipmentId);
    const workOrders = state.workOrders.filter((w) => w.equipmentId === equipmentId);
    const reports = state.reports.filter((r) => r.equipmentId === equipmentId);
    const audits = state.audits.filter((a) => a.equipmentId === equipmentId);
    const events = state.events
      .filter((e) => e.equipmentId === equipmentId)
      .slice()
      .sort((a, b) => (a.at < b.at ? 1 : -1));
    const rootCauses = workOrders.flatMap((w) =>
      w.rootCause ? [{ workOrderId: w.id, ...w.rootCause }] : [],
    );
    return { asset, complaints, workOrders, reports, audits, events, rootCauses };
  }, [state, equipmentId]);
}

export function useWorkOrder(workOrderId: string) {
  const { state } = useLifecycle();
  return useMemo(() => {
    const workOrder = state.workOrders.find((w) => w.id === workOrderId);
    const asset = workOrder
      ? state.equipment.find((e) => e.id === workOrder.equipmentId)
      : undefined;
    const complaint = workOrder?.complaintId
      ? state.complaints.find((c) => c.id === workOrder.complaintId)
      : undefined;
    const report = workOrder?.serviceReportId
      ? state.reports.find((r) => r.id === workOrder.serviceReportId)
      : undefined;
    return { workOrder, asset, complaint, report };
  }, [state, workOrderId]);
}

export function useLifecycleAnalytics() {
  const { state } = useLifecycle();
  return useMemo(() => {
    const rootCauseCounts = new Map<string, number>();
    let preventive = 0;
    let breakdown = 0;
    let totalDuration = 0;
    let durationSamples = 0;
    let partsCost = 0;

    for (const wo of state.workOrders) {
      if (wo.rootCause)
        rootCauseCounts.set(
          wo.rootCause.category,
          (rootCauseCounts.get(wo.rootCause.category) ?? 0) + 1,
        );
      if (wo.type === "Preventive" || wo.type === "Calibration") preventive += 1;
      else breakdown += 1;
      if (wo.durationMins) {
        totalDuration += wo.durationMins;
        durationSamples += 1;
      }
      partsCost += wo.parts.reduce((s, p) => s + p.cost * p.qty, 0);
    }

    const failureByEquipment = state.equipment
      .map((e) => ({
        id: e.id,
        name: e.name,
        failures: state.complaints.filter((c) => c.equipmentId === e.id).length,
        health: e.health,
        department: e.department,
      }))
      .sort((a, b) => b.failures - a.failures);

    const byDepartment = Array.from(
      state.equipment.reduce((map, e) => {
        const row = map.get(e.department) ?? {
          department: e.department,
          assets: 0,
          health: 0,
          complaints: 0,
        };
        row.assets += 1;
        row.health += e.health;
        row.complaints += state.complaints.filter((c) => c.equipmentId === e.id).length;
        map.set(e.department, row);
        return map;
      }, new Map<string, { department: string; assets: number; health: number; complaints: number }>()),
    ).map(([, v]) => ({ ...v, health: Math.round(v.health / v.assets) }));

    const engineerLoad = Array.from(
      state.workOrders.reduce((map, w) => {
        map.set(w.engineer, (map.get(w.engineer) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([engineer, open]) => ({ engineer, open }));

    return {
      rootCauseDistribution: Array.from(rootCauseCounts, ([name, value]) => ({ name, value })),
      maintenanceMix: [
        { name: "Preventive", value: preventive },
        { name: "Breakdown / corrective", value: breakdown },
      ],
      avgDuration: durationSamples ? Math.round(totalDuration / durationSamples) : 0,
      partsCost,
      failureByEquipment,
      byDepartment,
      engineerLoad,
      repeatedFailures: failureByEquipment.filter((f) => f.failures > 1),
      openComplaints: state.complaints.filter((c) => c.status !== "Closed").length,
      awaitingReview: state.reports.filter((r) => r.decision === "Submitted").length,
      auditsPending: state.audits.filter((a) => a.status === "Submitted").length,
    };
  }, [state]);
}
