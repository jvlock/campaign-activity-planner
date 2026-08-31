import { Route, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Shell } from "@/components/layout/shell";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import CampaignWorkspace from "@/pages/campaigns/workspace";
import NewWebinar from "@/pages/campaigns/new-webinar";
import Governance from "@/pages/governance";
import NotFound from "@/pages/not-found";

export default function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/:id" component={CampaignWorkspace} />
        <Route path="/new" component={NewWebinar} />
        <Route path="/governance" component={Governance} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}
