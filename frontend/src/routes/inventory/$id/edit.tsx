import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { useInventoryMutations, useInventoryRecord } from "@/lib/api/useInventory";
import type { ApiInventoryInput } from "@/lib/api/types";

const description = "Edit inventory specifications, location, thresholds and vendor assignment.";

export const Route = createFileRoute("/inventory/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Inventory Item — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Edit Inventory Item — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryEditRoute,
});

function InventoryEditRoute() {
  const { id } = Route.useParams();
  const live = useInventoryRecord(id);
  const { update } = useInventoryMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="inventory" id={id} />;

  return (
    <ModuleEdit
      moduleKey="inventory"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const payload: Partial<ApiInventoryInput> = {
          name: values.name,
          sku: values.sku,
          category: values.category,
          itemType: values.itemType,
          description: values.description,
          manufacturer: values.manufacturer,
          vendorId: values.vendorId,
          unit: values.unit,
          minStockLevel: values.minStockLevel ? Number(values.minStockLevel) : undefined,
          reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : undefined,
          maxStockLevel: values.maxStockLevel ? Number(values.maxStockLevel) : undefined,
          unitCost: values.unitCost ? Number(values.unitCost) : undefined,
          storageLocation: values.storageLocation,
          departmentId: values.departmentId,
          batchNumber: values.batchNumber,
          serialNumber: values.serialNumber,
          expiryDate: values.expiryDate,
        };
        const saved = await update(id, payload);
        const savedId = saved.itemId || saved._id;
        void navigate({ to: "/inventory/$id", params: { id: savedId } });
        return { id: savedId };
      }}
    />
  );
}
