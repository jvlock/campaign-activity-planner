import { Route, Switch } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Shell } from "@/components/layout/shell";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import NewCampaign from "@/pages/campaigns/new";
import CampaignWorkspace from "@/pages/campaigns/workspace";
import NewActivity from "@/pages/activities/new";
import ActivityWorkspace from "@/pages/activities/workspace";
import CommunicationWorkspace from "@/pages/communications/workspace";
import Governance from "@/pages/governance";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

export default function Router() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Authentication check failed")))
      .then(({ user }) => setAuthState(user ? "authenticated" : "unauthenticated"))
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  if (authState === "loading") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;
  }

  if (authState !== "authenticated") {
    const returnTo = import.meta.env.BASE_URL;
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Activity Planner</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Log in with an authorized account to create and manage governed campaigns.
          </p>
          <a
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            href={`/api/login?returnTo=${encodeURIComponent(returnTo)}`}
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/new" component={NewCampaign} />
        <Route path="/campaigns/:id" component={CampaignWorkspace} />
        <Route path="/activities/new" component={NewActivity} />
        <Route path="/activities/:id" component={ActivityWorkspace} />
        <Route path="/communications/:id" component={CommunicationWorkspace} />
        <Route path="/governance" component={Governance} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

type AuthState = "loading" | "authenticated" | "unauthenticated" | "forbidden";
