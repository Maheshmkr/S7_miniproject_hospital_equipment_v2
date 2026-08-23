import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { usePurchaseOrderMutations } from "@/lib/api/usePurchaseOrders";
import { toPurchaseOrderPayload } from "@/lib/api/purchaseOrderRecords";

const description =
  "Raise a new purchase order against an approved vendor, with server-calculated totals.";

export const Route = createFileRoute("/purchase-orders/new")({
  head: () => ({
    meta: [
      { title: "Raise Purchase Order — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Raise Purchase Order — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderCreateRoute,
});

function PurchaseOrderCreateRoute() {
  const { create } = usePurchaseOrderMutations();
  const navigate = useNavigate();
  if (!apiEnabled) return <ModuleCreate moduleKey="purchase-orders" />;
  return (
    <ModuleCreate
      moduleKey="purchase-orders"
      onSave={async (values) => {
        const saved = await create(toPurchaseOrderPayload(values));
        const id = saved.purchaseOrderId || saved._id;
        void navigate({ to: "/purchase-orders/$id", params: { id } });
        return { id };
      }}
    />
  );
}
