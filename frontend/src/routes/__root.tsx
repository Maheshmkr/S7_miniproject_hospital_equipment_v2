import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LifecycleProvider } from "@/lib/lifecycle/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-float transition-all md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground md:text-2xl">
            This page didn't load
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-destructive/15 bg-destructive/5 p-4 text-left">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              Error
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                {error.name || "Error"}: {error.message || "An unexpected error occurred"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showDetails ? (
                <>
                  Hide technical details
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show technical details
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </button>

            {showDetails && (
              <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-black/5 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground dark:bg-black/40 border border-border/50">
                {error.stack || "No stack trace available"}
              </pre>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:bg-accent hover:-translate-y-0.5 active:translate-y-0"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Medixa — Hospital Asset Intelligence Platform" },
      {
        name: "description",
        content:
          "Medixa is an enterprise command center for hospital equipment, maintenance, complaints and warranty operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";
  const roleHome: Record<string, string> = {
    engineer: "/engineer",
    staff: "/staff",
    technician: "/inventory",
  };
  const scoped = user ? roleHome[user.role] : undefined;
  const sharedPrefixes =
    user?.role === "engineer"
      ? ["/audits", "/maintenance", "/complaints"]
      : user?.role === "technician"
        ? ["/inventory", "/purchase-orders"]
        : [];
  const outOfScope =
    !!scoped && !pathname.startsWith(scoped) && !sharedPrefixes.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!ready) return;
    if (!user && !isLogin) void navigate({ to: "/login", replace: true });
    else if (user && isLogin) void navigate({ to: user.home as never, replace: true });
    else if (
      user?.role === "staff" &&
      (pathname === "/complaints/new" || pathname === "/complaints")
    ) {
      void navigate({
        to: (pathname === "/complaints/new"
          ? "/staff/complaints/new"
          : "/staff/complaints") as never,
        replace: true,
      });
    } else if (outOfScope) void navigate({ to: scoped as never, replace: true });
  }, [ready, user, isLogin, outOfScope, scoped, navigate, pathname]);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (isLogin) return user ? <div className="min-h-screen bg-background" /> : <Outlet />;
  if (!user || outOfScope) return <div className="min-h-screen bg-background" />;

  return (
    <AppShell>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LifecycleProvider>
          <AuthGate />
        </LifecycleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
