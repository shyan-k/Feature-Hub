import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  Circle,
  CircleDashed,
  Clock3,
  Cloud,
  Compass,
  Cross,
  Flag,
  Flame,
  Headphones,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import {
  getGetCurrentUserQueryKey,
  getGetTrackerInsightsQueryKey,
  getGetTrackerQueryKey,
  type AuthUser,
  type TrackerPage,
  type TrackerState,
  useCreateReport,
  useGetCurrentUser,
  useGetTracker,
  useGetTrackerInsights,
  useSaveTracker,
  useSignIn,
  useSignOut,
  useSignUp,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Route,
  Switch,
  Link,
  useLocation,
  Router as WouterRouter,
} from "wouter";

const queryClient = new QueryClient();
const today = () => new Date().toISOString().slice(0, 10);

// The generated TrackerPage type only knows "none" | "checked" | "crossed"
// for trackerData values. Rather than edit the generated @workspace/api-zod
// package, we track the extra "half" ("O") state with this local type and
// cast at the point we hand data back to the generated save mutation.
type DayValue = "none" | "checked" | "half" | "crossed";
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const colors = ["#196cff", "#05a7b5", "#7c5cff", "#ef7295", "#f3a53b"];
const OWNER_EMAIL = "pakoreaassociates@gmail.com";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function useInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  return {
    canInstall: Boolean(installEvent) && !installed,
    installed,
    install,
  };
}

function CreditsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#071b48]/40 p-5 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        className="w-full max-w-md rounded-[28px] border border-border bg-card p-7 shadow-2xl animate-rise"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
              about this space
            </p>
            <h2
              id="credits-title"
              className="mt-2 font-display text-3xl font-bold"
            >
              Credits<span className="text-primary">.</span>
            </h2>
          </div>
          <button
            data-testid="button-close-credits"
            onClick={onClose}
            aria-label="Close credits"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-8 rounded-2xl bg-primary/5 p-5">
          <p className="text-lg font-semibold">
            Every credit goes to Shayan Khan.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Days Tracking Pro is a private place to keep promises, notice
            patterns, and make the day count.
          </p>
        </div>
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Also Me
        </p>
        <Button
          data-testid="button-dismiss-credits"
          variant="outline"
          onClick={onClose}
          className="mt-6 w-full"
        >
          Back to my days
        </Button>
      </section>
    </div>
  );
}

function InstallHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#071b48]/40 p-5 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        className="w-full max-w-md rounded-[28px] border border-border bg-card p-7 shadow-2xl animate-rise"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
              install days
            </p>
            <h2
              id="install-help-title"
              className="mt-2 font-display text-3xl font-bold"
            >
              Keep it close<span className="text-primary">.</span>
            </h2>
          </div>
          <button
            data-testid="button-close-install-help"
            onClick={onClose}
            aria-label="Close install instructions"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>
        <ol className="mt-8 space-y-4 text-sm leading-6 text-muted-foreground">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <span>Open your browser menu or share menu.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <span>
              Choose <strong className="text-foreground">Install app</strong> or{" "}
              <strong className="text-foreground">Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <span>
              Confirm. Your private space will open like a normal app.
            </span>
          </li>
        </ol>
        <Button
          data-testid="button-dismiss-install-help"
          variant="outline"
          onClick={onClose}
          className="mt-7 w-full"
        >
          Got it
        </Button>
      </section>
    </div>
  );
}

function OwnerWelcomeScreen() {
  return (
    <main className="noise relative grid min-h-[100dvh] place-items-center overflow-hidden bg-[#071b48] text-[#dff8ff]">
      <div className="absolute -right-36 -top-36 h-[480px] w-[480px] rounded-full bg-[#1552d8] opacity-35 blur-[3px] animate-breathe" />
      <div className="absolute bottom-[-160px] left-[-120px] h-[420px] w-[420px] rounded-full border border-[#58ddfb]/20" />
      <section className="relative px-6 text-center animate-rise">
        <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#6fe4ff] text-[#092258] shadow-[0_0_0_12px_rgba(111,228,255,.1),0_18px_60px_rgba(25,108,255,.35)] animate-owner-logo">
          <img
            src="/icon-192.png"
            alt=""
            className="h-16 w-16 rounded-2xl object-cover"
          />
        </div>
        <p className="mt-9 font-mono text-[10px] uppercase tracking-[.25em] text-[#73e4ff]">
          private space unlocked
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,6vw,5rem)] font-bold tracking-[-.06em]">
          We’re glad to see you,
          <br />
          <span className="text-[#72e6ff]">owner.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#b7d2ef]">
          Your rhythm is ready. Opening your days now.
        </p>
        <div className="mx-auto mt-8 h-1 w-28 overflow-hidden rounded-full bg-[#507bb6]/40">
          <div className="h-full w-1/2 rounded-full bg-[#72e6ff] animate-owner-progress" />
        </div>
      </section>
    </main>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "outline" | "danger";
}) {
  const styles = {
    primary:
      "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(25,108,255,.18)] hover:translate-y-[-1px] hover:shadow-[0_11px_24px_rgba(25,108,255,.24)]",
    quiet:
      "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    outline:
      "border border-border bg-card text-foreground hover:border-primary hover:text-primary",
    danger:
      "border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" data-testid="link-logo" className="flex items-center gap-3">
      <img
        src="/icon-192.png"
        alt=""
        className="h-9 w-9 rounded-xl object-cover shadow-[0_0_0_5px_rgba(111,228,255,.12)]"
      />
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight">
          days<span className="text-[#68defc]">.</span>
        </span>
      )}
    </Link>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className={`h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${props.className ?? ""}`}
      />
    </label>
  );
}

function AuthHome() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [ownerWelcome, setOwnerWelcome] = useState(false);
  const signIn = useSignIn();
  const signUp = useSignUp();
  const client = useQueryClient();
  const { canInstall, installed, install } = useInstallPrompt();
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const pending = signIn.isPending || signUp.isPending;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = form.email
      .trim()
      .toLowerCase()
      .replace(/,(?=com$)/, ".");
    const onSuccess = () => {
      if (normalizedEmail === OWNER_EMAIL) {
        setOwnerWelcome(true);
        window.setTimeout(
          () =>
            client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }),
          2800,
        );
      } else {
        client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      }
    };
    const onError = (err: unknown) =>
      setError(
        (err as { error?: string })?.error ?? "That did not work. Try again.",
      );
    if (mode === "signin")
      signIn.mutate(
        { data: { email: normalizedEmail, password: form.password } },
        { onSuccess, onError },
      );
    else
      signUp.mutate(
        { data: { ...form, email: normalizedEmail } },
        { onSuccess, onError },
      );
  };
  if (ownerWelcome) return <OwnerWelcomeScreen />;
  return (
    <main className="noise min-h-[100dvh] overflow-hidden bg-[#071b48] text-[#dff8ff]">
      <div className="absolute -right-40 -top-40 h-[530px] w-[530px] rounded-full bg-[#1552d8] opacity-40 blur-[3px] animate-breathe" />
      <div className="absolute bottom-[-180px] left-[-130px] h-[450px] w-[450px] rounded-full border border-[#58ddfb]/20" />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1440px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="flex flex-col justify-between px-7 py-8 sm:px-12 lg:px-20 lg:py-12">
          <Logo />
          <div className="max-w-xl py-16 lg:py-0 animate-rise">
            <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.18em] text-[#73e4ff]">
              <span className="h-px w-8 bg-[#73e4ff]" />a place to keep promises
            </div>
            <h1 className="font-display text-[clamp(3.7rem,8vw,7.4rem)] font-extrabold leading-[.9] tracking-[-.07em]">
              Make the day
              <br />
              <span className="text-[#72e6ff]">count.</span>
            </h1>
            <p className="mt-9 max-w-md text-lg leading-8 text-[#b7d2ef]">
              A vivid, private ritual for the habits you want to carry. One
              check-in at a time, with room to notice how far you’ve come.
            </p>
            <div className="mt-12 flex flex-wrap gap-3 text-xs font-medium text-[#a7c3e7]">
              <span className="rounded-full border border-[#6fe4ff]/25 px-3 py-2">
                quietly motivating
              </span>
              <span className="rounded-full border border-[#6fe4ff]/25 px-3 py-2">
                made for real life
              </span>
            </div>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            <p className="text-xs text-[#7294bd]">
              Your rhythm belongs to you.
            </p>
            {!installed && (
              <button
                data-testid="button-install-app-auth"
                onClick={() =>
                  canInstall ? install() : setInstallHelpOpen(true)
                }
                className="rounded-full border border-[#6fe4ff]/25 px-3 py-2 text-xs font-semibold text-[#b7d2ef] transition hover:border-[#6fe4ff]/60 hover:text-[#73e4ff]"
              >
                {canInstall ? "Install app" : "Install via browser menu"}
              </button>
            )}
          </div>
        </section>
        <section className="flex items-center px-7 py-10 sm:px-12 lg:px-20">
          <div className="w-full max-w-[430px] rounded-[28px] border border-[#b1ecff]/20 bg-[#0c2a62]/75 p-7 shadow-2xl backdrop-blur-xl sm:p-9 animate-rise delay-1">
            <div className="mb-9 flex gap-6 border-b border-[#b1ecff]/15">
              {(["signin", "signup"] as const).map((item) => (
                <button
                  key={item}
                  data-testid={`button-auth-${item}`}
                  onClick={() => {
                    setMode(item);
                    setError("");
                  }}
                  className={`relative pb-4 text-sm font-semibold transition ${mode === item ? "text-[#79e5ff]" : "text-[#89a7d1]"}`}
                >
                  {item === "signin" ? "Welcome back" : "New ritual"}
                  {mode === item && (
                    <span className="absolute bottom-[-1px] left-0 h-0.5 w-full bg-[#70e2ff]" />
                  )}
                </button>
              ))}
            </div>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold tracking-tight">
                {mode === "signin"
                  ? "Return to your days."
                  : "Start with one promise."}
              </h2>
              <p className="mt-2 text-sm text-[#9cb9de]">
                {mode === "signin"
                  ? "Your space is waiting."
                  : "Small, steady, yours."}
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#9cb9de]">
                    Your name
                  </span>
                  <input
                    data-testid="input-signup-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-12 w-full rounded-xl border border-[#a1c7ec]/20 bg-[#082354] px-4 text-sm outline-none focus:border-[#70e2ff] focus:ring-4 focus:ring-[#70e2ff]/10"
                    placeholder="What should we call you?"
                  />
                </label>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#9cb9de]">
                  Email
                </span>
                <input
                  data-testid="input-auth-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value.replace(/,(?=com$)/i, "."),
                    })
                  }
                  className="h-12 w-full rounded-xl border border-[#a1c7ec]/20 bg-[#082354] px-4 text-sm outline-none focus:border-[#70e2ff] focus:ring-4 focus:ring-[#70e2ff]/10"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#9cb9de]">
                  Password
                </span>
                <input
                  data-testid="input-auth-password"
                  required
                  minLength={mode === "signup" ? 8 : 1}
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="h-12 w-full rounded-xl border border-[#a1c7ec]/20 bg-[#082354] px-4 text-sm outline-none focus:border-[#70e2ff] focus:ring-4 focus:ring-[#70e2ff]/10"
                  placeholder="At least 8 characters"
                />
              </label>
              {error && (
                <p
                  data-testid="status-auth-error"
                  className="rounded-xl bg-[#ff8c9b]/10 p-3 text-sm text-[#ffadb8]"
                >
                  {error}
                </p>
              )}
              <Button
                data-testid="button-auth-submit"
                type="submit"
                disabled={pending}
                className="mt-3 h-13 w-full bg-[#70e2ff] text-[#092258]"
              >
                {pending
                  ? "Finding your space…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Sign up"}
                <ArrowRight size={17} />
              </Button>
            </form>
            <p className="mt-7 text-center text-xs leading-5 text-[#7898c2]">
              Private by default. No feeds, no noise, no performance.
            </p>
          </div>
        </section>
      </div>
      {installHelpOpen && (
        <InstallHelpDialog onClose={() => setInstallHelpOpen(false)} />
      )}
    </main>
  );
}

function Shell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const signOut = useSignOut();
  const client = useQueryClient();
  const { canInstall, installed, install } = useInstallPrompt();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const nav = [
    { href: "/", label: "Today", icon: LayoutDashboard },
    { href: "/insights", label: "Insights", icon: TrendingUp },
    { href: "/settings", label: "Settings", icon: Settings2 },
  ];
  const doSignOut = () => {
    signOut.mutate(undefined, {
      onSettled: () => client.resetQueries(),
    });
  };
  return (
    <div className="noise flex min-h-[100dvh] bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[270px] transform bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              data-testid="button-close-menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-sidebar-foreground/60 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-14">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-sidebar-foreground/45">
              Your space
            </p>
            <nav className="space-y-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                  {href === "/" && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary opacity-0 transition group-hover:opacity-100" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto">
            <div className="mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sidebar-primary">
                <Cloud size={15} />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  in sync
                </span>
              </div>
              <p className="text-xs leading-5 text-sidebar-foreground/60">
                Your check-ins are safely tucked away.
              </p>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                data-testid="button-open-credits"
                onClick={() => setCreditsOpen(true)}
                className="rounded-xl border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 transition hover:border-sidebar-primary/60 hover:text-sidebar-foreground"
              >
                Credits
              </button>
              <button
                data-testid="button-install-app"
                onClick={() =>
                  canInstall ? install() : setInstallHelpOpen(true)
                }
                disabled={installed}
                className="rounded-xl border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 transition hover:border-sidebar-primary/60 hover:text-sidebar-foreground disabled:cursor-default disabled:opacity-60"
              >
                {installed
                  ? "Installed"
                  : canInstall
                    ? "Install"
                    : "Install help"}
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-2 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  data-testid="text-user-name"
                  className="truncate text-sm font-semibold"
                >
                  {user.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/50">
                  {user.email}
                </p>
              </div>
              <button
                data-testid="button-sign-out"
                onClick={doSignOut}
                title="Sign out"
                className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          data-testid="button-overlay-menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[#071b48]/40 lg:hidden"
        />
      )}
      <div className="min-w-0 flex-1">
        <header className="flex h-[78px] items-center justify-between border-b border-border/70 px-5 sm:px-8 lg:px-12">
          <button
            data-testid="button-open-menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground lg:hidden"
          >
            <Menu size={21} />
          </button>
          <div className="hidden text-xs font-medium text-muted-foreground sm:block">
            <span className="text-primary">Days</span> / personal rhythm
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-border sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#21c9b2]" />
              all saved
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground lg:hidden">
              {initials(user.name)}
            </div>
          </div>
        </header>
        <main className="ritual-grid min-h-[calc(100dvh-78px)] px-5 py-8 sm:px-8 lg:px-12 lg:py-11">
          {children}
        </main>
      </div>
      {creditsOpen && <CreditsDialog onClose={() => setCreditsOpen(false)} />}
      {installHelpOpen && (
        <InstallHelpDialog onClose={() => setInstallHelpOpen(false)} />
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-44 rounded-lg bg-muted" />
      <div className="h-48 rounded-3xl bg-muted" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-72 rounded-3xl bg-muted" />
        <div className="h-72 rounded-3xl bg-muted" />
      </div>
    </div>
  );
}

function AuthWall() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Compass size={30} />
      </div>
      <h1 className="font-display text-3xl font-bold">
        Your rhythm is waiting.
      </h1>
      <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
        Sign in to see the patterns hiding in your everyday check-ins.
      </p>
      <Link href="/" data-testid="link-auth-wall" className="mt-7">
        <Button>
          Enter your space <ArrowRight size={16} />
        </Button>
      </Link>
    </div>
  );
}

function DayCell({
  date,
  value,
  onChange,
  size = "md",
}: {
  date: string;
  value: DayValue;
  onChange: (date: string, value: DayValue) => void;
  size?: "md" | "sm";
}) {
  const day = new Date(`${date}T12:00:00`);
  const label = day
    .toLocaleDateString("en-US", { weekday: "short" })
    .slice(0, 2);
  const number = day.getDate();
  const change = () => {
    // Four-state cycle: an empty day becomes a check, a check becomes a
    // half ("O" — partially done, keeps the streak alive without growing
    // it), a half becomes a cross, and a cross clears back to empty.
    const next: DayValue =
      value === "checked"
        ? "half"
        : value === "half"
          ? "crossed"
          : value === "crossed"
            ? "none"
            : "checked";
    if (
      localStorage.getItem("days-sound") !== "off" &&
      "AudioContext" in window
    ) {
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value =
          next === "checked" ? 660 : next === "half" ? 420 : 220;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.035, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.12,
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
      }
    }
    onChange(date, next);
  };
  const dims = size === "sm" ? "h-9 w-9 sm:h-10 sm:w-10" : "h-11 w-11 sm:h-12 sm:w-12";
  const toneClass =
    value === "checked"
      ? "border-primary bg-primary text-primary-foreground shadow-[0_5px_16px_rgba(25,108,255,.22)] animate-check-pop"
      : value === "half"
        ? "border-[#e1912f]/60 bg-[#fff4df] text-[#b5720f]"
        : value === "crossed"
          ? "border-[#ef7295]/50 bg-[#fff0f4] text-[#d95878]"
          : "border-border bg-background text-muted-foreground hover:border-primary/50";
  return (
    <div className="group flex flex-col items-center gap-2">
      <span className="font-mono text-[10px] uppercase text-muted-foreground">
        {label}
      </span>
      <button
        data-testid={`button-day-${date}`}
        title={`${date}: ${value === "half" ? "half-done" : value}`}
        onClick={change}
        className={`relative grid ${dims} place-items-center rounded-xl border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}
      >
        {value === "checked" ? (
          <Check size={18} strokeWidth={2.5} />
        ) : value === "half" ? (
          <span className="text-[15px] font-bold leading-none">O</span>
        ) : value === "crossed" ? (
          <X size={17} />
        ) : (
          <span>{number}</span>
        )}
      </button>
    </div>
  );
}

function NewPage({
  onCreate,
  onClose,
}: {
  onCreate: (page: TrackerPage) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);
  const create = () => {
    if (!name.trim()) return;
    onCreate({
      id: `page-${Date.now()}`,
      habitName: name.trim(),
      color,
      icon: "spark",
      startDate: today(),
      daysCount: 30,
      autoCheck: "none",
      timer: "never",
      trackerData: {},
      history: [],
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#071b48]/35 p-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl animate-rise">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
              new page
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">
              What are you carrying?
            </h2>
          </div>
          <button
            data-testid="button-close-new-page"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5">
          <Input
            label="A habit or intention"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read before bed"
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
              Page color
            </p>
            <div className="flex gap-3">
              {colors.map((item) => (
                <button
                  data-testid={`button-color-${item}`}
                  key={item}
                  onClick={() => setColor(item)}
                  className={`h-9 w-9 rounded-full transition ${color === item ? "ring-4 ring-primary/20 ring-offset-2" : ""}`}
                  style={{ backgroundColor: item }}
                />
              ))}
            </div>
          </div>
          <Button
            data-testid="button-create-page"
            onClick={create}
            disabled={!name.trim()}
            className="mt-3 w-full"
          >
            Begin this page <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TrackerHome({ user }: { user: AuthUser }) {
  const {
    data: serverTracker,
    isLoading,
    isError,
  } = useGetTracker({ query: { queryKey: getGetTrackerQueryKey() } });
  const save = useSaveTracker();
  const client = useQueryClient();
  const initialized = useRef(false);
  const [tracker, setTracker] = useState<TrackerState | null>(null);
  const [showNew, setShowNew] = useState(false);
  useEffect(() => {
    if (serverTracker && !initialized.current) {
      initialized.current = true;
      const auto = localStorage.getItem("days-auto") as
        | "none"
        | "tick"
        | "cross"
        | null;
      const next =
        auto && auto !== "none"
          ? {
              ...serverTracker,
              pages: serverTracker.pages.map((page) => {
                const start = new Date(`${page.startDate}T12:00:00`);
                if (Number.isNaN(start.getTime())) return page;
                const data = { ...page.trackerData };
                for (let index = 0; index < page.daysCount; index += 1) {
                  const day = new Date(start);
                  day.setDate(start.getDate() + index);
                  const key = day.toISOString().slice(0, 10);
                  if (key < today() && (!data[key] || data[key] === "none")) {
                    data[key] = auto === "tick" ? "checked" : "crossed";
                  }
                }
                return { ...page, trackerData: data };
              }),
            }
          : serverTracker;
      setTracker(next);
      if (next !== serverTracker) saveTrackerState(next);
    }
  }, [serverTracker]);
  const active =
    tracker?.pages.find((page) => page.id === tracker.activePageId) ??
    tracker?.pages[0];
  // The full, chronological run of dates for the active page's own window —
  // always exactly `daysCount` days long, starting wherever `startDate` is
  // set, regardless of which day of the month/year that is.
  const pageDates = useMemo(() => {
    if (!active) return [] as string[];
    const start = new Date(`${active.startDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return [] as string[];
    return Array.from({ length: active.daysCount }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d.toISOString().slice(0, 10);
    });
  }, [active]);
  const stats = useMemo(() => {
    if (!active) return { streak: 0, totalChecked: 0, totalHalf: 0, totalCrossed: 0 };
    let totalChecked = 0;
    let totalHalf = 0;
    let totalCrossed = 0;
    for (const key of pageDates) {
      const v = (active.trackerData[key] as DayValue | undefined) ?? "none";
      if (v === "checked") totalChecked += 1;
      else if (v === "half") totalHalf += 1;
      else if (v === "crossed") totalCrossed += 1;
    }
    // Walk backward from today (skipping days that haven't happened yet)
    // to find the live streak. A half day keeps the streak going without
    // growing it; a crossed day, or an unmarked day that's already past,
    // ends it.
    const todayKey = today();
    let streak = 0;
    for (let i = pageDates.length - 1; i >= 0; i -= 1) {
      const key = pageDates[i];
      if (key > todayKey) continue;
      const v = (active.trackerData[key] as DayValue | undefined) ?? "none";
      if (v === "checked") {
        streak += 1;
        continue;
      }
      if (v === "half") continue;
      if (v === "crossed") break;
      if (key === todayKey) continue; // today just hasn't been marked yet
      break;
    }
    return { streak, totalChecked, totalHalf, totalCrossed };
  }, [active, pageDates]);
  if (isLoading) return <Skeleton />;
  if (isError)
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <RotateCcw size={23} />
        </div>
        <h2 className="font-display text-2xl font-bold">
          Your pages are taking a minute.
        </h2>
        <p className="mt-2 text-muted-foreground">
          We couldn’t reach your saved rhythm.
        </p>
        <Button
          data-testid="button-retry-tracker"
          onClick={() =>
            client.invalidateQueries({ queryKey: getGetTrackerQueryKey() })
          }
          variant="outline"
          className="mt-6"
        >
          Try again
        </Button>
      </div>
    );
  const saveTrackerState = (next: TrackerState) => save.mutate({ data: next });
  const persist = (next: TrackerState) => {
    setTracker(next);
    saveTrackerState(next);
  };
  const updatePage = (nextPage: TrackerPage) => {
    if (!tracker) return;
    persist({
      ...tracker,
      pages: tracker.pages.map((page) =>
        page.id === nextPage.id ? nextPage : page,
      ),
    });
  };
  const setDay = (date: string, value: DayValue) => {
    if (!active) return;
    updatePage({
      ...active,
      // The generated TrackerPage type only knows about three day states;
      // "half" is an extra client-side state layered on top of it. Cast at
      // this single boundary rather than widening the generated type.
      trackerData: { ...active.trackerData, [date]: value } as TrackerPage["trackerData"],
    });
  };
  const changeStartDate = (date: string) => {
    if (!active || !date) return;
    updatePage({ ...active, startDate: date });
  };
  const changeDaysCount = (count: number) => {
    if (!active || Number.isNaN(count)) return;
    updatePage({ ...active, daysCount: Math.min(90, Math.max(7, Math.round(count))) });
  };
  const createPage = (page: TrackerPage) => {
    const next = {
      ...(tracker ?? {
        profileName: user.name,
        pages: [],
        activePageId: page.id,
      }),
      pages: [...(tracker?.pages ?? []), page],
      activePageId: page.id,
    };
    persist(next);
    setShowNew(false);
  };
  const deletePage = (id: string) => {
    if (!tracker) return;
    const page = tracker.pages.find((p) => p.id === id);
    if (!page) return;
    if (
      !window.confirm(
        `Delete "${page.habitName}"? This can't be undone — its check-ins will be gone too.`,
      )
    )
      return;
    const remaining = tracker.pages.filter((p) => p.id !== id);
    persist({
      ...tracker,
      pages: remaining,
      activePageId:
        tracker.activePageId === id
          ? (remaining[0]?.id ?? "")
          : tracker.activePageId,
    });
  };
  const rangeLabel =
    pageDates.length > 0
      ? `${new Date(`${pageDates[0]}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${pageDates[pageDates.length - 1]}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "";
  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end animate-rise">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
            your daily ritual
          </p>
          <h1
            data-testid="text-greeting"
            className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-none tracking-[-.055em]"
          >
            Good to see you, {user.name?.split(" ")[0] ?? "there"}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Today is a good day to keep one small promise.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="button-add-page"
            variant="outline"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} /> new page
          </Button>
        </div>
      </div>
      {!active ? (
        <div className="rounded-[28px] border border-dashed border-primary/30 bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={29} />
          </div>
          <h2 className="font-display text-2xl font-bold">
            Make a page for what matters.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Pages make space for habits, intentions, and the quiet satisfaction
            of showing up.
          </p>
          <Button
            data-testid="button-empty-add-page"
            onClick={() => setShowNew(true)}
            className="mt-7"
          >
            <Plus size={16} /> start a page
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_16px_50px_rgba(28,91,170,.08)] animate-rise delay-1">
              <div className="flex flex-col gap-5 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="flex items-center gap-4">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: active.color }}
                  >
                    <Target size={22} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        data-testid="text-active-habit"
                        className="font-display text-xl font-bold"
                      >
                        {active.habitName}
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-secondary-foreground">
                        active
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rangeLabel} · {active.daysCount} days
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  <label className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                    start
                    <input
                      data-testid="input-page-start-date"
                      type="date"
                      value={active.startDate}
                      onChange={(e) => changeStartDate(e.target.value)}
                      className="bg-transparent font-mono text-[11px] text-foreground outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                    days
                    <input
                      data-testid="input-page-days-count"
                      type="number"
                      min={7}
                      max={90}
                      value={active.daysCount}
                      onChange={(e) => changeDaysCount(Number(e.target.value))}
                      className="w-12 bg-transparent font-mono text-[11px] text-foreground outline-none"
                    />
                  </label>
                </div>
              </div>
              <div className="px-6 py-8 sm:px-8">
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 sm:gap-3 md:grid-cols-10">
                  {pageDates.map((date) => (
                    <DayCell
                      key={date}
                      date={date}
                      value={(active.trackerData[date] as DayValue | undefined) ?? "none"}
                      onChange={setDay}
                      size="sm"
                    />
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span data-testid="text-week-checked" className="font-semibold text-foreground">
                      {stats.totalChecked} checked
                    </span>
                    <span className="font-semibold text-[#b5720f]">
                      {stats.totalHalf} half
                    </span>
                    <span className="font-semibold text-[#d95878]">
                      {stats.totalCrossed} crossed
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#e1912f]">
                    <Flame size={15} /> keep the ember going
                  </p>
                </div>
              </div>
            </section>
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b2b69] p-7 text-[#e1f8ff] shadow-[0_16px_50px_rgba(15,59,142,.2)] animate-rise delay-2">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-[#67e3ff]/20" />
              <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full border border-[#67e3ff]/15" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[#77e4ff]">
                  <Flame size={17} />
                  <span className="font-mono text-[10px] uppercase tracking-[.18em]">
                    your momentum
                  </span>
                </div>
                <p
                  data-testid="text-streak"
                  className="mt-8 font-display text-7xl font-bold tracking-[-.08em]"
                >
                  {Math.max(stats.streak, 0)}
                  <span className="ml-2 text-3xl text-[#79e5ff]">
                    {stats.streak === 1 ? "day" : "days"}
                  </span>
                </p>
                <p className="mt-2 max-w-[230px] text-sm leading-6 text-[#aac8e6]">
                  {stats.streak > 0
                    ? "A half day keeps this alive without rushing it. Let tomorrow meet today."
                    : "Your first check-in is waiting for you."}
                </p>
                <div className="mt-9 h-1.5 overflow-hidden rounded-full bg-[#507bb6]/40">
                  <div
                    className="h-full rounded-full bg-[#72e6ff] transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.totalChecked / Math.max(active.daysCount, 1)) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-[#83a9d4]">
                  <span>page completion</span>
                  <span>{Math.round((stats.totalChecked / Math.max(active.daysCount, 1)) * 100)}%</span>
                </div>
              </div>
            </section>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr_1.1fr]">
            <div className="rounded-[24px] border border-border bg-card p-6 animate-rise delay-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[.13em] text-muted-foreground">
                  Pages
                </span>
                <LayoutDashboard size={17} className="text-primary" />
              </div>
              <p
                data-testid="text-page-count"
                className="mt-5 font-display text-4xl font-bold"
              >
                {tracker?.pages.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                spaces for what matters
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-card p-6 animate-rise delay-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[.13em] text-muted-foreground">
                  Check-ins
                </span>
                <Check size={17} className="text-[#16af9c]" />
              </div>
              <p
                data-testid="text-checkin-count"
                className="mt-5 font-display text-4xl font-bold"
              >
                {stats.totalChecked}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                little acts of keeping faith
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-card p-6 animate-rise delay-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[.13em] text-muted-foreground">
                  A note for today
                </span>
                <Sparkles size={17} className="text-[#e1912f]" />
              </div>
              <p className="mt-5 text-sm font-medium leading-6">
                “Consistency is not loud. It is the quiet return.”
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                — your future self
              </p>
            </div>
          </div>
          {tracker && tracker.pages.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                your pages
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {tracker.pages.map((page) => (
                  <div
                    key={page.id}
                    className={`group flex min-w-[180px] items-center gap-1 rounded-2xl border p-3 transition ${page.id === active.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                  >
                    <button
                      data-testid={`button-page-${page.id}`}
                      onClick={() =>
                        persist({ ...tracker, activePageId: page.id })
                      }
                      className="flex flex-1 items-center gap-3 overflow-hidden text-left"
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-lg"
                        style={{ backgroundColor: page.color }}
                      />
                      <span className="truncate text-sm font-semibold">
                        {page.habitName}
                      </span>
                    </button>
                    <button
                      data-testid={`button-delete-page-${page.id}`}
                      onClick={() => deletePage(page.id)}
                      aria-label={`Delete ${page.habitName}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {showNew && (
        <NewPage onCreate={createPage} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

function InsightsPage() {
  const { data, isLoading, isError } = useGetTrackerInsights({
    query: { queryKey: getGetTrackerInsightsQueryKey() },
  });
  if (isLoading) return <Skeleton />;
  if (isError || !data) return <AuthWall />;
  const max = Math.max(
    ...data.weekly.map((day) => day.checked + day.crossed),
    1,
  );
  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-10 animate-rise">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
          a wider view
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-none tracking-[-.06em]">
          Notice your rhythm<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Progress is not a straight line. These are the little patterns your
          check-ins are making.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "total checked",
            value: data.totalChecked,
            icon: Check,
            tone: "text-primary bg-primary/10",
          },
          {
            label: "best streak",
            value: `${data.bestStreak} days`,
            icon: Flame,
            tone: "text-[#e1912f] bg-[#fff4df]",
          },
          {
            label: "completion rate",
            value: `${Math.round(data.completionRate)}%`,
            icon: Target,
            tone: "text-[#16af9c] bg-[#e7fbf7]",
          },
          {
            label: "active days",
            value: data.activeDays,
            icon: Activity,
            tone: "text-[#7c5cff] bg-[#f0edff]",
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm animate-rise delay-1"
          >
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
            >
              <Icon size={19} />
            </div>
            <p
              data-testid={`text-insight-${label.replaceAll(" ", "-")}`}
              className="mt-5 font-display text-4xl font-bold tracking-tight"
            >
              {value}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-rise delay-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Weekly rhythm</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Checked and crossed, side by side.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-secondary-foreground">
              last 7 days
            </span>
          </div>
          <div className="mt-9 flex h-52 items-end justify-between gap-3 sm:gap-7">
            {data.weekly.map((day) => {
              const total = day.checked + day.crossed;
              return (
                <div
                  key={day.day}
                  className="flex flex-1 flex-col items-center gap-3"
                >
                  <div className="flex h-40 w-full max-w-10 flex-col justify-end gap-1">
                    <div
                      className="w-full rounded-t-lg bg-primary transition-all duration-500"
                      style={{
                        height: `${total ? Math.max((day.checked / max) * 100, 10) : 3}%`,
                      }}
                    />
                    <div
                      className="w-full rounded-b-lg bg-[#f3a9ba]"
                      style={{
                        height: `${day.crossed ? Math.max((day.crossed / max) * 100, 8) : 2}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-primary" />
              checked
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#f3a9ba]" />
              crossed
            </span>
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-rise delay-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={17} />
            <span className="font-mono text-[10px] uppercase tracking-widest">
              a gentle read
            </span>
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold leading-tight">
            {data.completionRate > 70
              ? "You are building something real."
              : "The return is the ritual."}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {data.totalChecked
              ? `You have made ${data.totalChecked} checked-in moments across ${data.totalPages} ${data.totalPages === 1 ? "page" : "pages"}. Let that be enough evidence for today.`
              : "Your first check-in will give this page a pulse. There is no perfect place to begin."}
          </p>
          <div className="mt-8 rounded-2xl bg-secondary/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-secondary-foreground">
              remember
            </p>
            <p className="mt-2 text-sm font-semibold text-secondary-foreground">
              A crossed day is data, not a verdict.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsPage({ user }: { user: AuthUser }) {
  const [dark, setDark] = useState(
    () => localStorage.getItem("days-theme") === "dark",
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem("days-sound") !== "off",
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("days-notifications") === "on",
  );
  const [auto, setAuto] = useState(
    () => localStorage.getItem("days-auto") ?? "none",
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({
    message: "",
    name: user.name,
    email: user.email,
  });
  const createReport = useCreateReport();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("days-theme", dark ? "dark" : "light");
  }, [dark]);
  const pref = (key: string, value: string) => localStorage.setItem(key, value);
  const submitReport = (e: React.FormEvent) => {
    e.preventDefault();
    createReport.mutate(
      { data: report },
      {
        onSuccess: () => {
          setReport({ ...report, message: "" });
          setReportOpen(false);
        },
      },
    );
  };
  const Toggle = ({
    checked,
    onChange,
    testId,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    testId: string;
  }) => (
    <button
      data-testid={testId}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full p-1 transition ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-10 animate-rise">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
          your preferences
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-none tracking-[-.06em]">
          Make it yours<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          A few quiet controls for the way your space feels.
        </p>
      </div>
      <div className="space-y-5">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-rise delay-1">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Circle size={19} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Profile</h2>
              <p className="text-sm text-muted-foreground">
                The details attached to your rhythm.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[.12em] text-muted-foreground">
                Name
              </p>
              <p
                data-testid="text-settings-name"
                className="rounded-xl bg-muted/60 px-4 py-3 text-sm font-semibold"
              >
                {user.name}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-[.12em] text-muted-foreground">
                Email
              </p>
              <p
                data-testid="text-settings-email"
                className="rounded-xl bg-muted/60 px-4 py-3 text-sm"
              >
                {user.email}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-rise delay-2">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0edff] text-[#7c5cff]">
              <Sun size={19} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Atmosphere</h2>
              <p className="text-sm text-muted-foreground">
                Set the tone when you come back.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="text-sm font-semibold">Night tide</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A deep, low-light palette for late check-ins.
                </p>
              </div>
              <Toggle
                checked={dark}
                onChange={(value) => setDark(value)}
                testId="switch-theme"
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold">Check-in sound</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave room for a soft sound cue when you mark a day.
                </p>
              </div>
              <Toggle
                checked={sound}
                onChange={(value) => {
                  setSound(value);
                  pref("days-sound", value ? "on" : "off");
                }}
                testId="switch-sound"
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div>
                <p className="text-sm font-semibold">Gentle reminders</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A nudge when a page has been quiet.
                </p>
              </div>
              <Toggle
                checked={notifications}
                onChange={(value) => {
                  setNotifications(value);
                  pref("days-notifications", value ? "on" : "off");
                }}
                testId="switch-notifications"
              />
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-rise delay-3">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff4df] text-[#e1912f]">
              <Timer size={19} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">
                Auto-check preference
              </h2>
              <p className="text-sm text-muted-foreground">
                When a timer completes, mark a quiet day for you.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["none", "Never"],
              ["tick", "Check it"],
              ["cross", "Cross it"],
            ].map(([value, label]) => (
              <button
                data-testid={`button-auto-${value}`}
                key={value}
                onClick={() => {
                  setAuto(value);
                  pref("days-auto", value);
                }}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${auto === value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
              >
                {label}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {value === "none"
                    ? "I’ll choose"
                    : value === "tick"
                      ? "A little win"
                      : "Honest data"}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Info size={19} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                Something feel off?
              </h2>
              <p className="text-sm text-muted-foreground">
                Send a note to the people tending this space.
              </p>
            </div>
          </div>
          <Button
            data-testid="button-open-report"
            variant="outline"
            onClick={() => setReportOpen(true)}
          >
            Send a report <Send size={15} />
          </Button>
        </section>
      </div>
      {reportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071b48]/35 p-5 backdrop-blur-sm">
          <form
            onSubmit={submitReport}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl animate-rise"
          >
            <div className="mb-7 flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
                  support note
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">
                  Tell us what happened.
                </h2>
              </div>
              <button
                data-testid="button-close-report"
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Message
              </span>
              <textarea
                data-testid="input-report-message"
                required
                minLength={5}
                value={report.message}
                onChange={(e) =>
                  setReport({ ...report, message: e.target.value })
                }
                className="min-h-32 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="What should we know?"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                data-testid="button-cancel-report"
                variant="quiet"
                onClick={() => setReportOpen(false)}
              >
                Not now
              </Button>
              <Button
                data-testid="button-submit-report"
                type="submit"
                disabled={createReport.isPending || report.message.length < 5}
              >
                {createReport.isPending ? "Sending…" : "Send note"}{" "}
                <Send size={15} />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RoutedApp() {
  const { data: user, isLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  if (isLoading)
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#071b48]">
        <div className="text-center text-[#b7d2ef]">
          <div className="mx-auto mb-5 h-10 w-10 rounded-full border-2 border-[#70e2ff] border-t-transparent animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-[.2em]">
            opening your space
          </p>
        </div>
      </main>
    );
  if (!user)
    return (
      <Switch>
        <Route path="/" component={AuthHome} />
        <Route component={AuthHome} />
      </Switch>
    );
  return (
    <Shell user={user}>
      <Switch>
        <Route path="/" component={() => <TrackerHome user={user} />} />
        <Route path="/insights" component={InsightsPage} />
        <Route
          path="/settings"
          component={() => <SettingsPage user={user} />}
        />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <h1 className="font-display text-4xl font-bold">A quiet corner.</h1>
      <p className="mt-3 text-muted-foreground">This page doesn’t exist yet.</p>
      <Link
        href="/"
        data-testid="link-not-found-home"
        className="mt-7 inline-block"
      >
        <Button>Back to today</Button>
      </Link>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <RoutedApp />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
