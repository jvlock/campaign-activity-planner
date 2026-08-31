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

export default function Router() {
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
