/**
 * useEngineerWorkflow
 *
 * Central state hook used by every engineer workflow page
 * (Start -> Checklist -> Breakdown -> Evidence -> Service Report -> Complete).
 *
 * Given a workOrderId string (e.g. "WO-4472" or a MongoDB _id):
 *   1. Fetches the full WorkOrder context from the backend.
 *   2. Looks for an existing Maintenance record for that WO.
 *   3. Exposes startWork() which creates the Maintenance record
 *      (by calling POST /work-orders/:id/start) on first use.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { workOrdersApi } from "./workOrdersApi";
import { maintenanceApi } from "./maintenanceApi";
import type { ApiMaintenance, ApiWorkOrderContext } from "./types";

const msg = (err: unknown, fb: string) => (err instanceof ApiRequestError ? err.message : fb);

export type EngineerWorkflowState = {
  enabled: boolean;
  context: ApiWorkOrderContext | null;
  maintenance: ApiMaintenance | null;
  workOrderLabel: string;
  loading: boolean;
  error: string | null;
  startWork: () => Promise<ApiMaintenance | null>;
  reload: () => void;
};

export function useEngineerWorkflow(workOrderId: string): EngineerWorkflowState {
  const [context, setContext] = useState<ApiWorkOrderContext | null>(null);
  const [maintenance, setMaintenance] = useState<ApiMaintenance | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled || !workOrderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    workOrdersApi
      .get(workOrderId)
      .then(async (ctx) => {
        if (cancelled) return;
        if (!cancelled) {
          setContext(ctx);
          if (ctx.maintenance) {
            setMaintenance(ctx.maintenance);
          }
        }
        try {
          const page = await maintenanceApi.list({
            workOrderId: ctx.workOrder._id,
            limit: 1,
          });
          if (!cancelled && page.items.length > 0) {
            setMaintenance(page.items[0]!);
          }
        } catch {
          // Fall back to ctx.maintenance
        }
      })
      .catch((err) => !cancelled && setError(msg(err, "Unable to load work order.")))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [workOrderId, nonce]);

  const startWork = useCallback(async (): Promise<ApiMaintenance | null> => {
    if (!apiEnabled) return null;
    const targetId = context?.workOrder._id || workOrderId;
    if (!targetId) return null;
    try {
      const updatedCtx = await workOrdersApi.start(targetId);
      if (updatedCtx.maintenance) {
        setMaintenance(updatedCtx.maintenance);
        setContext(updatedCtx);
        return updatedCtx.maintenance;
      }
      const page = await maintenanceApi.list({
        workOrderId: updatedCtx.workOrder?._id || targetId,
        limit: 1,
      });
      const m = page.items[0] ?? null;
      if (m) setMaintenance(m);
      return m;
    } catch (err) {
      setError(msg(err, "Failed to start maintenance."));
      return null;
    }
  }, [context, workOrderId]);

  return {
    enabled: apiEnabled,
    context,
    maintenance,
    workOrderLabel: context?.workOrder.workOrderId ?? workOrderId,
    loading,
    error,
    startWork,
    reload,
  };
}
