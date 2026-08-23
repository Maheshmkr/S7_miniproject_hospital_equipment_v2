import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { useWarrantyRecord } from "@/lib/api/useWarranty";

export const Route = createFileRoute("/warranty/$id/")({
  head: () => ({
    meta: [
      { title: "Contract Details — Medixa" },
      {
        name: "description",
        content: "Full contract profile, performance index and recent activity.",
      },
      { property: "og:title", content: "Contract Details — Medixa" },
      {
        property: "og:description",
        content: "Full contract profile, performance index and recent activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyDetailsRoute,
});

function WarrantyDetailsRoute() {
  const { id } = Route.useParams();
  const live = useWarrantyRecord(id);
  if (!live.enabled) return <ModuleDetails moduleKey="warranty" id={id} />;
  return (
    <ModuleDetails
      moduleKey="warranty"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
