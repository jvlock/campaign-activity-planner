import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Shell } from "@/components/layout/shell";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Campaigns = lazy(() => import("@/pages/campaigns"));
const NewCampaign = lazy(() => import("@/pages/campaigns/new"));
const CampaignWorkspace = lazy(() => import("@/pages/campaigns/workspace"));
const NewActivity = lazy(() => import("@/pages/activities/new"));
const ActivityWorkspace = lazy(() => import("@/pages/activities/workspace"));
const CommunicationWorkspace = lazy(() => import("@/pages/communications/workspace"));
const Governance = lazy(() => import("@/pages/governance"));
const NotFound = lazy(() => import("@/pages/not-found"));

export default function Router() {
  return (
    <Shell>
      <Suspense fallback={
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-4" aria-live="polite">
          <h1 className="text-3xl font-bold tracking-tight">Activity Planner</h1>
          <p className="text-muted-foreground">Opening your campaign workspace…</p>
        </main>
      }>
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
      </Suspense>
    </Shell>
  );
}
