import { Link } from "wouter";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Megaphone, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-4 w-full max-w-4xl">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
        <p className="text-muted-foreground mt-1">Live overview of campaign operations and readiness.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Active Campaigns
            </CardDescription>
            <CardTitle className="text-3xl">{dashboard.activeCampaigns}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" /> Upcoming Activities
            </CardDescription>
            <CardTitle className="text-3xl">{dashboard.upcomingActivities}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-secondary" /> Comms in Review
            </CardDescription>
            <CardTitle className="text-3xl">{dashboard.communicationsInReview}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className={dashboard.blockingWarnings > 0 ? "border-l-4 border-l-destructive bg-destructive/5" : "border-l-4 border-l-muted"}>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold flex items-center gap-2">
              <AlertCircle className={dashboard.blockingWarnings > 0 ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} /> 
              Blocking Warnings
            </CardDescription>
            <CardTitle className={dashboard.blockingWarnings > 0 ? "text-3xl text-destructive" : "text-3xl"}>
              {dashboard.blockingWarnings}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Active Campaigns</h2>
            <Link href="/campaigns" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          <div className="grid gap-3">
            {dashboard.campaigns.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No active campaigns found.
              </Card>
            ) : (
              dashboard.campaigns.map(campaign => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block group">
                  <Card className="transition-all hover:border-primary hover:shadow-md h-full flex flex-col justify-center">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">{campaign.shortTitle}</CardTitle>
                          <CardDescription className="mt-1 font-mono text-xs">{campaign.campaignCode || 'No Code'}</CardDescription>
                        </div>
                        <Badge variant={campaign.lifecycleStatus === 'Active' ? 'default' : 'secondary'}>
                          {campaign.lifecycleStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Upcoming Communications</h2>
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {dashboard.upcomingCommunications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No upcoming communications.
                </div>
              ) : (
                dashboard.upcomingCommunications.map(comm => (
                  <div key={comm.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{comm.shortTitle}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(comm.scheduledDate), "MMM d, yyyy")} at {comm.sendTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{comm.channel}</Badge>
                      {comm.warningCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {comm.warningCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
