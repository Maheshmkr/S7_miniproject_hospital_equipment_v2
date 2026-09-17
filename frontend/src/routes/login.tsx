import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BriefcaseMedical, Building2, HardHat, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { demoUsers, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Medixa Hospital Asset Intelligence" },
      {
        name: "description",
        content:
          "Sign in to Medixa to reach your administrator command center or biomedical engineer field workspace.",
      },
      { property: "og:title", content: "Sign in — Medixa" },
      {
        property: "og:description",
        content: "Role-based access for hospital asset administrators and biomedical engineers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoUsers[0]!.email);
  const [password, setPassword] = useState("Medixa#2026");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await signIn(email, password);
      void navigate({ to: user.home as never, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between gradient-primary p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <BriefcaseMedical className="size-5" strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-[15px] font-bold tracking-tight">Medixa</span>
            <span className="block text-[11px] text-white/75">Asset Intelligence</span>
          </span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            One platform. Three very different days at work.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/80">
            Administrators run the estate-wide command center, biomedical engineers get a focused
            field workspace, and department staff monitor their own equipment and report issues.
          </p>
          <div className="mt-8 space-y-3">
            {[
              {
                icon: ShieldCheck,
                label: "Administrator",
                detail: "Equipment, complaints, warranty, analytics",
              },
              {
                icon: HardHat,
                label: "Biomedical Engineer",
                detail: "Assigned tasks, maintenance workflow, calendar",
              },
              {
                icon: Building2,
                label: "Department Staff",
                detail: "Department equipment, complaints, service reports",
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur"
              >
                <r.icon className="mt-0.5 size-[18px] shrink-0" />
                <span>
                  <span className="block text-[13px] font-semibold">{r.label}</span>
                  <span className="block text-[11.5px] text-white/75">{r.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11.5px] text-white/60">© 2026 Medixa Health Systems</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-2xl gradient-primary shadow-glow">
              <BriefcaseMedical className="size-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-bold tracking-tight">Medixa</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Use your hospital account. Your role decides which workspace opens.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Work email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[13.5px] outline-none transition-colors focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[13.5px] outline-none transition-colors focus:border-primary"
              />
            </label>
            {error && (
              <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-primary text-[13.5px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sign in
            </button>
          </form>

          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              Demo accounts
            </p>
            <div className="mt-3 space-y-2">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    setError(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft",
                    email === u.email && "border-primary bg-primary-soft",
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-lg gradient-primary text-[11px] font-bold text-white">
                    {u.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-foreground">
                      {u.name}
                      {u.departmentName && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {u.departmentName.replace(" Department", "")}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {u.title}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
