import { useParams, Link, useLocation } from "wouter";
import { 
  useGetCampaign,
  useRetryCampaignGovernance,
  exportImplementationWorkbook,
  getGetCampaignQueryKey,
} from "@workspace/api-client-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar, AlertTriangle, Shield, Plus, Activity, Download, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadImplementationWorkbook } from "@/lib/export-workbook";

export default function CampaignWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: workspace, isLoading } = useGetCampaign(id!);
  const retryGovernance = useRetryCampaignGovernance();
  const queryClient = useQueryClient();

  const handleRetryGovernance = () => {
    if (!id) return;
    retryGovernance.mutate({ campaignId: id }, {
      onSuccess: () => {
        toast.success("Governance synchronization retried.");
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      },
      onError: (err) => toast.error("Failed to retry governance. " + err)
    });
  };

  const handleExportWorkbook = async () => {
    if (!id) return;
    try {
      const workbook = await exportImplementationWorkbook(id);
      await downloadImplementationWorkbook(workbook);
      toast.success("Implementation workbook downloaded.");
    } catch (error) {
      toast.error(`Workbook export failed. ${String(error)}`);
    }
  };

  if (isLoading || !workspace) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-8 w-full max-w-7xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const { campaign, activities } = workspace;

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0 z-10 shadow-sm">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.shortTitle }
        ]} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {campaign.shortTitle}
              <Badge variant={campaign.lifecycleStatus === 'Active' ? 'default' : 'secondary'}>{campaign.lifecycleStatus}</Badge>
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{campaign.objective}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handleExportWorkbook}>
              <Download className="h-4 w-4" /> Export Workbook
            </Button>
            <Button className="gap-2" onClick={() => setLocation(`/activities/new?campaignId=${campaign.id}`)}>
              <Plus className="h-4 w-4" /> Add Activity
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/10 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-sm border-t-4 border-t-primary">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-lg">Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign Code</span>
                    <p className="font-mono text-sm">{campaign.campaignCode || 'Pending'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</span>
                    <p className="font-medium text-sm">{campaign.owner}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type & Period</span>
                    <p className="font-medium text-sm whitespace-nowrap">
                      {campaign.campaignType || 'N/A'} • {campaign.fiscalPeriod || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</span>
                    <p className="font-medium text-sm whitespace-nowrap">
                      {format(parseISO(campaign.startDate), "MMM d")} - {format(parseISO(campaign.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Unit</span>
                    <p className="font-medium text-sm">{campaign.businessUnit}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</span>
                    <p className="font-medium text-sm">{campaign.product}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segment</span>
                    <p className="font-medium text-sm">{campaign.audienceSegment || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geography</span>
                    <p className="font-medium text-sm">{campaign.geography}</p>
                  </div>
                  {campaign.description && (
                    <div className="space-y-1 col-span-2 md:col-span-4 mt-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{campaign.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-t-4 border-t-accent">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Governance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sync Status</span>
                  <Badge variant={campaign.governanceStatus === 'Authoritative' ? 'default' : 'secondary'} className={campaign.governanceStatus === 'Pending authoritative assignment' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-transparent' : ''}>
                    {campaign.governanceStatus}
                  </Badge>
                </div>
                {campaign.governanceStatus === 'Pending authoritative assignment' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>Awaiting central ID assignment.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-white/50 border-amber-300 hover:bg-amber-100 text-amber-900"
                      onClick={handleRetryGovernance}
                      disabled={retryGovernance.isPending}
                    >
                      {retryGovernance.isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : null}
                      Retry Sync
                    </Button>
                  </div>
                )}
                {campaign.warningCount > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{campaign.warningCount} compliance warnings found across activities.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="text-xl">Campaign Activities</CardTitle>
                <CardDescription>All scheduled activities within this campaign container.</CardDescription>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="h-8 w-8 text-muted" />
                        <p>No activities added yet.</p>
                        <Button variant="link" onClick={() => setLocation(`/activities/new?campaignId=${campaign.id}`)}>
                          Add your first activity
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id} className="group hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-foreground line-clamp-1">{activity.shortTitle}</div>
                        <div className="text-xs text-muted-foreground mt-1">{activity.internalTitle}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{activity.activityType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={activity.lifecycleStatus === 'Active' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                          {activity.lifecycleStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(activity.eventDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setLocation(`/activities/${activity.id}`)}
                        >
                          Manage <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
