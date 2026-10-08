import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/engineer/tasks/$id/start")({
  component: StartMaintenanceRedirectRoute,
});

function StartMaintenanceRedirectRoute() {
  const { id } = Route.useParams();
  return <Navigate to="/engineer/tasks/$id/checklist" params={{ id }} replace />;
}
