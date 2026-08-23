import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  History,
  PencilLine,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Truck,
} from "lucide-react";
import { ActionButton, Breadcrumbs } from "@/components/workflow/pages";
import { EmptyState, Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { useInventoryMutations, useInventoryRecord } from "@/lib/api/useInventory";
import { cn } from "@/lib/utils";

const description =
  "Inventory item details: Available stock, unit economics, movement history, and stock operations.";

export const Route = createFileRoute("/inventory/$id/")({
  head: () => ({
    meta: [
      { title: "Inventory Item Details — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Inventory Item Details — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryDetailsRoute,
});

function InventoryDetailsRoute() {
  const { id } = Route.useParams();
  const live = useInventoryRecord(id);
  const mutations = useInventoryMutations();

  const [activeModal, setActiveModal] = useState<"RECEIVE" | "ISSUE" | "RETURN" | "ADJUST" | null>(
    null,
  );
  const [modalQty, setModalQty] = useState("");
  const [modalReason, setModalReason] = useState("");
  const [modalRef, setModalRef] = useState("");
  const [modalCost, setModalCost] = useState("");
  const [modalBatch, setModalBatch] = useState("");
  const [opLoading, setOpLoading] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  if (live.loading) {
    return (
      <div className="mx-auto max-w-[1600px] py-16">
        <EmptyState
          icon={<Boxes className="size-6" />}
          title="Loading inventory item…"
          hint="Fetching live stock balances and movement trail from the server."
        />
      </div>
    );
  }

  if (live.error || !live.record || !live.item) {
    return (
      <div className="mx-auto max-w-[1600px] py-16">
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="Inventory item not found"
          hint={live.error ?? `No item matching ${id} exists in the inventory register.`}
        />
      </div>
    );
  }

  const { record, item, movements } = live;

  const handleStockOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpLoading(true);
    setOpError(null);
    try {
      const q = Number(modalQty);
      if (Number.isNaN(q) || q <= 0) {
        throw new Error("Please enter a valid positive quantity");
      }

      if (activeModal === "RECEIVE") {
        await mutations.receive(item.itemId, {
          quantity: q,
          unitCost: modalCost ? Number(modalCost) : undefined,
          batchNumber: modalBatch || undefined,
          reason: modalReason || "Stock replenishment",
          reference: modalRef || undefined,
        });
      } else if (activeModal === "ISSUE") {
        await mutations.issue(item.itemId, {
          quantity: q,
          reason: modalReason || "Part issued for maintenance",
          reference: modalRef || undefined,
        });
      } else if (activeModal === "RETURN") {
        await mutations.returnStock(item.itemId, {
          quantity: q,
          reason: modalReason || "Returned unused stock",
          reference: modalRef || undefined,
        });
      } else if (activeModal === "ADJUST") {
        await mutations.adjust(item.itemId, {
          newQuantity: q,
          reason: modalReason || "Physical stock count adjustment",
        });
      }

      setActiveModal(null);
      setModalQty("");
      setModalReason("");
      setModalRef("");
      setModalCost("");
      setModalBatch("");
      live.reload();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Failed to execute stock operation.");
    } finally {
      setOpLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Breadcrumbs
        moduleKey="inventory"
        trail={[{ label: "Register", to: "/inventory/list" }, { label: record.title }]}
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={record.tone}>{record.status}</Pill>
              <Pill tone="neutral">{record.id}</Pill>
              {item.sku && <Pill tone="neutral">SKU: {item.sku}</Pill>}
            </div>
            <h1 className="mt-3 text-[30px] font-bold leading-tight">{record.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{record.subtitle}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <ActionButton
                variant="primary"
                onClick={() => {
                  setActiveModal("RECEIVE");
                  setOpError(null);
                }}
                icon={ArrowDownLeft}
              >
                Receive Stock
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setActiveModal("ISSUE");
                  setOpError(null);
                }}
                icon={ArrowUpRight}
              >
                Issue Stock
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setActiveModal("RETURN");
                  setOpError(null);
                }}
                icon={RotateCcw}
              >
                Return Stock
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setActiveModal("ADJUST");
                  setOpError(null);
                }}
                icon={SlidersHorizontal}
              >
                Adjust Balance
              </ActionButton>
              <ActionButton
                to={`/inventory/${record.id}/edit` as never}
                variant="ghost"
                icon={PencilLine}
              >
                Edit Details
              </ActionButton>
            </div>
          </div>
          <div className="self-center">
            <Ring value={record.score} size={116} sub="Stock Level" />
          </div>
        </div>
      </section>

      {/* Grid panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Master Details */}
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Item Details & Stock Levels"
            subtitle="Specifications, location and inventory thresholds"
            icon={<ClipboardList className="size-4" />}
          />
          <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2 sm:px-7">
            {record.meta.map((x) => (
              <div key={x.label} className="rounded-2xl border border-border px-4 py-3.5">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {x.label}
                </dt>
                <dd className="mt-1 truncate text-[13.5px] font-semibold">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* Stock Meter & KPI */}
        <Panel>
          <PanelHead
            title="Inventory Status"
            subtitle="Quantity vs Reorder Threshold"
            icon={<TrendingUp className="size-4" />}
          />
          <div className="space-y-5 px-6 pb-6">
            <Meter
              value={record.score}
              tone={
                record.tone === "danger"
                  ? "danger"
                  : record.tone === "warning"
                    ? "warning"
                    : "success"
              }
            />
            <div className="space-y-2.5 rounded-2xl border border-border p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available Quantity</span>
                <span className="font-bold text-foreground">
                  {item.availableQuantity} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reorder Threshold</span>
                <span className="font-bold text-foreground">
                  {item.reorderLevel} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safety Stock (Min)</span>
                <span className="font-bold text-foreground">
                  {item.minStockLevel} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Cost</span>
                <span className="font-bold text-foreground">${item.unitCost}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total Stock Value</span>
                <span className="font-bold text-primary">${item.totalValue}</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Movement Timeline */}
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Stock Movement History"
            subtitle="Full chronological receipt, issue and adjustment trail"
            icon={<History className="size-4" />}
            action={
              <Link
                to={`/inventory/${record.id}/history` as never}
                className="text-[12px] font-semibold text-primary"
              >
                Full history
              </Link>
            }
          />
          {movements.length === 0 ? (
            <p className="px-7 pb-7 text-xs text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <ul className="space-y-4 px-7 pb-7">
              {movements.slice(0, 8).map((m) => (
                <li key={m._id || m.movementId} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      m.type === "RECEIPT" || m.type === "RETURN"
                        ? "bg-success"
                        : m.type === "ISSUE"
                          ? "bg-warning"
                          : "bg-primary",
                    )}
                  />
                  <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {m.type}: {m.quantity} {item.unit || "units"}
                      </span>
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                        {m.movementId}
                      </span>
                    </div>
                    <p className="mt-0.5">
                      {m.reason || m.reference || "Stock balance update"} · Balance: {m.newQuantity}{" "}
                      {item.unit}
                    </p>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                      {new Date(m.createdAt).toLocaleString("en-GB")} · By{" "}
                      {typeof m.performedBy === "object" && m.performedBy
                        ? m.performedBy.name
                        : "System"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Quick Links / Related */}
        <Panel>
          <PanelHead
            title="Procurement & Vendors"
            subtitle="Linked vendor and replenishment"
            icon={<Truck className="size-4" />}
          />
          <div className="space-y-3 px-6 pb-6">
            {item.vendorId && typeof item.vendorId === "object" ? (
              <div className="rounded-2xl border border-border p-4 text-xs">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Primary Supplier
                </p>
                <p className="mt-1 font-bold text-foreground">{item.vendorId.name}</p>
                {item.vendorId.contactPerson && (
                  <p className="mt-1 text-muted-foreground">
                    Contact: {item.vendorId.contactPerson}
                  </p>
                )}
                {item.vendorId.email && (
                  <p className="text-muted-foreground">Email: {item.vendorId.email}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No primary vendor assigned.</p>
            )}

            <Link
              to="/purchase-orders/new"
              className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
            >
              <span>Raise Purchase Order for this item</span>
              <ArrowUpRight className="size-4 text-primary" />
            </Link>
          </div>
        </Panel>
      </div>

      {/* Stock Operation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-lift">
            <h2 className="text-lg font-bold text-foreground">
              {activeModal === "RECEIVE" && "Receive Stock into Inventory"}
              {activeModal === "ISSUE" && "Issue Stock for Asset / Maintenance"}
              {activeModal === "RETURN" && "Return Stock to Inventory"}
              {activeModal === "ADJUST" && "Adjust Stock Balance"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.itemId} — {item.name} (Current balance: {item.availableQuantity} {item.unit})
            </p>

            {opError && (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {opError}
              </div>
            )}

            <form onSubmit={handleStockOperation} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  {activeModal === "ADJUST" ? "New Actual Balance" : "Quantity"} ({item.unit})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              {activeModal === "RECEIVE" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalCost}
                      onChange={(e) => setModalCost(e.target.value)}
                      placeholder={String(item.unitCost)}
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={modalBatch}
                      onChange={(e) => setModalBatch(e.target.value)}
                      placeholder="e.g. BATCH-2026-X"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Reference / Order ID
                </label>
                <input
                  type="text"
                  value={modalRef}
                  onChange={(e) => setModalRef(e.target.value)}
                  placeholder="e.g. PO-0001 or EQ-1001"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Reason / Notes
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Justification for this stock movement…"
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={opLoading}
                  className="rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow disabled:opacity-50"
                >
                  {opLoading ? "Saving…" : "Confirm Operation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
