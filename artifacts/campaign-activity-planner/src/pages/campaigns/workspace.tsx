import { useParams, Link } from "wouter";
import { 
  useGetCampaign, 
  useUpdateCommunication, 
  useGetCommunicationReadiness, 
  usePreviewReschedule,
  useConfirmReschedule,
  getGetCampaignQueryKey,
  ReschedulePreview
} from "@workspace/api-client-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Calendar, CheckCircle2, AlertTriangle, Clock, Send, PenTool, LayoutTemplate, MessageSquare, Plus, Activity, RefreshCw, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CampaignWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { data: workspace, isLoading } = useGetCampaign(id!);
  const [selectedCommId, setSelectedCommId] = useState<string | null>(null);
  
  // Reschedule state
  const [rescheduleActivityId, setRescheduleActivityId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [previewData, setPreviewData] = useState<ReschedulePreview | null>(null);
  
  const previewReschedule = usePreviewReschedule();
  const confirmReschedule = useConfirmReschedule();
  const queryClient = useQueryClient();

  const handlePreviewReschedule = () => {
    if (!rescheduleActivityId || !rescheduleDate) return;
    
    previewReschedule.mutate({
      activityId: rescheduleActivityId,
      data: { eventDate: rescheduleDate }
    }, {
      onSuccess: (data) => setPreviewData(data),
      onError: (err) => toast.error("Failed to preview reschedule. " + err)
    });
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleActivityId || !rescheduleDate) return;
    
    confirmReschedule.mutate({
      activityId: rescheduleActivityId,
      data: { eventDate: rescheduleDate }
    }, {
      onSuccess: () => {
        toast.success("Activity and communications rescheduled successfully.");
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id!) });
        setRescheduleActivityId(null);
        setPreviewData(null);
      },
      onError: (err) => toast.error("Failed to confirm reschedule. " + err)
    });
  };

  useEffect(() => {
    // Auto-select first comm when loaded if none selected
    if (workspace?.communications?.length && !selectedCommId) {
      setSelectedCommId(workspace.communications[0].id);
    }
  }, [workspace, selectedCommId]);

  if (isLoading || !workspace) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-8 w-full max-w-7xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-96 bg-muted rounded"></div>
            <div className="col-span-1 h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const { campaign, activities, communications } = workspace;
  const selectedComm = communications.find(c => c.id === selectedCommId);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0 z-10">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.shortTitle }
        ]} />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {campaign.shortTitle}
              <Badge variant={campaign.lifecycleStatus === 'Active' ? 'default' : 'secondary'}>{campaign.lifecycleStatus}</Badge>
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{campaign.objective}</p>
          </div>
          <div className="flex items-center gap-4 text-sm bg-muted/30 px-4 py-2 rounded-md border">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Timeline</span>
              <span className="font-mono">{format(parseISO(campaign.startDate), "MMM d")} - {format(parseISO(campaign.endDate), "MMM d, yyyy")}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Owner</span>
              <span className="font-medium">{campaign.owner}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Left Pane - Journey & Calendar */}
        <div className="flex-1 overflow-auto bg-muted/10 p-6 flex flex-col gap-6 relative">
          <Tabs defaultValue="journey" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="journey" className="gap-2"><LayoutTemplate className="h-4 w-4"/> Journey View</TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2"><Calendar className="h-4 w-4"/> Calendar View</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="journey" className="m-0 space-y-6">
              {activities.map(activity => {
                const activityComms = communications.filter(c => c.activityId === activity.id);
                // Sort comms by date logically
                const sortedComms = [...activityComms].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                return (
                  <Card key={activity.id} className="border-l-4 border-l-primary shadow-sm overflow-hidden">
                    <div className="bg-card border-b px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{activity.shortTitle}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mt-0.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(activity.eventDate), "MMMM d, yyyy")} at {activity.startTime} {activity.timezone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-2"
                          onClick={() => {
                            setRescheduleActivityId(activity.id);
                            setRescheduleDate(activity.eventDate);
                            setPreviewData(null);
                          }}
                        >
                          <CalendarDays className="h-3.5 w-3.5" /> Reschedule
                        </Button>
                        <Badge variant="outline" className="uppercase">{activity.activityType}</Badge>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-background/50">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Attached Communications
                      </h4>
                      <div className="relative">
                        <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border"></div>
                        <div className="space-y-4">
                          {sortedComms.map(comm => {
                            const isSelected = selectedCommId === comm.id;
                            const isPast = new Date(comm.scheduledDate) < new Date();
                            
                            return (
                              <div 
                                key={comm.id} 
                                className={`relative pl-8 transition-all cursor-pointer group ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                                onClick={() => setSelectedCommId(comm.id)}
                              >
                                <div className={`absolute left-0 top-3 h-[22px] w-[22px] rounded-full border-2 bg-background z-10 flex items-center justify-center transition-colors ${
                                  isSelected ? 'border-primary' : 'border-muted-foreground group-hover:border-primary/50'
                                }`}>
                                  <div className={`h-2 w-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/30'}`}></div>
                                </div>
                                
                                <Card className={`transition-all ${isSelected ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}`}>
                                  <div className="p-4 flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-semibold text-foreground">{comm.shortTitle}</h5>
                                        {comm.warningCount > 0 && (
                                          <Badge variant="destructive" className="h-5 px-1.5 flex items-center gap-1 text-[10px]">
                                            <AlertTriangle className="h-3 w-3" /> {comm.warningCount}
                                          </Badge>
                                        )}
                                        {comm.sent && (
                                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white h-5 px-1.5 flex items-center gap-1 text-[10px]">
                                            <CheckCircle2 className="h-3 w-3" /> Sent
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {format(parseISO(comm.scheduledDate), "MMM d")} @ {comm.sendTime}
                                        </span>
                                        <span>•</span>
                                        <span>{comm.relativeRule}</span>
                                        <span>•</span>
                                        <span className="bg-muted px-1.5 py-0.5 rounded text-foreground/80">{comm.audienceBranch}</span>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{comm.channel}</Badge>
                                  </div>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>
            
            <TabsContent value="calendar" className="m-0">
              <Card className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
                <Calendar className="h-12 w-12 text-muted mb-4" />
                <p className="font-medium text-lg text-foreground">Calendar view coming soon</p>
                <p>A full month-grid rendering of this campaign's activities.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Pane - Content Editor */}
        <div className="w-[450px] flex-shrink-0 border-l bg-card flex flex-col shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.03)] z-20">
          {selectedComm ? (
            <CommunicationEditor key={selectedComm.id} communication={selectedComm} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <PenTool className="h-12 w-12 text-muted mb-4" />
              <p>Select a communication from the journey to view or edit.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleActivityId} onOpenChange={(open) => !open && setRescheduleActivityId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule Activity & Impact Preview</DialogTitle>
            <DialogDescription>
              Changing the anchor date will automatically adjust all relatively scheduled communications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>New Event Date</Label>
                <Input 
                  type="date" 
                  value={rescheduleDate} 
                  onChange={e => setRescheduleDate(e.target.value)} 
                />
              </div>
              <div className="flex items-end pb-0.5">
                <Button 
                  onClick={handlePreviewReschedule} 
                  disabled={previewReschedule.isPending}
                >
                  {previewReschedule.isPending ? "Calculating..." : "Preview Impact"}
                </Button>
              </div>
            </div>

            {previewData && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Impact Analysis</h4>
                  {previewData.warnings.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {previewData.warnings.length} Warnings
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  {previewData.items.map((item, i) => (
                    <div key={i} className={`text-sm p-3 rounded border flex items-center justify-between ${item.warning ? 'bg-amber-50/50 border-amber-200' : 'bg-background'}`}>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                          <span>{format(parseISO(item.oldDate), "MMM d")}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className={item.warning ? 'text-amber-700 font-bold' : 'text-primary font-bold'}>
                            {format(parseISO(item.proposedDate), "MMM d")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={item.warning ? 'text-amber-700 border-amber-300' : ''}>
                        {item.action}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {previewData.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 space-y-1">
                    <p className="font-semibold">Review required:</p>
                    <ul className="list-disc pl-5">
                      {previewData.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleActivityId(null)}>Cancel</Button>
            <Button 
              onClick={handleConfirmReschedule} 
              disabled={!previewData || confirmReschedule.isPending}
            >
              {confirmReschedule.isPending ? "Confirming..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component to handle per-communication state and debounced saves
function CommunicationEditor({ communication }: { communication: any }) {
  const queryClient = useQueryClient();
  const updateComm = useUpdateCommunication();
  const { data: readiness, isLoading: isReadinessLoading } = useGetCommunicationReadiness(communication.id);

  // Local state for debounced editing
  const [subject, setSubject] = useState(communication.subject || "");
  const [preheader, setPreheader] = useState(communication.preheader || "");
  const [body, setBody] = useState(communication.body || "");
  
  // Ref for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // We use a ref to store the mutation function so we don't trigger effects when the hook object changes
  const mutateRef = useRef(updateComm.mutate);
  mutateRef.current = updateComm.mutate;

  const handleSave = (field: string, value: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      mutateRef.current({
        communicationId: communication.id,
        data: { [field]: value }
      }, {
        onSuccess: (updatedComm) => {
          // Update the cache immediately without refetching to avoid layout jumping
          queryClient.setQueryData(getGetCampaignQueryKey(communication.campaignId || ''), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              communications: old.communications.map((c: any) => 
                c.id === updatedComm.id ? updatedComm : c
              )
            };
          });
        }
      });
    }, 1000);
  };

  const isEmail = communication.channel.toLowerCase() === 'email';

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground line-clamp-1 pr-4">{communication.shortTitle}</h3>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{communication.channel}</Badge>
            <span>{communication.status}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-11 justify-start px-4">
            <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-11 data-[state=active]:bg-transparent">
              Content Draft
            </TabsTrigger>
            <TabsTrigger value="readiness" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-11 data-[state=active]:bg-transparent">
              Readiness Check
              {communication.warningCount > 0 && (
                <span className="ml-2 rounded-full bg-destructive text-destructive-foreground w-4 h-4 text-[10px] flex items-center justify-center">
                  {communication.warningCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="p-5 space-y-5 m-0 focus-visible:ring-0">
            {isEmail && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject Line</Label>
                  <Input 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => {
                      setSubject(e.target.value);
                      handleSave('subject', e.target.value);
                    }}
                    placeholder="Enter an engaging subject..."
                    disabled={communication.sent}
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preheader" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Preheader</Label>
                  <Input 
                    id="preheader" 
                    value={preheader} 
                    onChange={(e) => {
                      setPreheader(e.target.value);
                      handleSave('preheader', e.target.value);
                    }}
                    placeholder="Inbox preview text..."
                    disabled={communication.sent}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="body" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Message Body</Label>
              <Textarea 
                id="body" 
                value={body} 
                onChange={(e) => {
                  setBody(e.target.value);
                  handleSave('body', e.target.value);
                }}
                placeholder="Write the primary communication content..."
                disabled={communication.sent}
                className="min-h-[250px] font-sans resize-y"
              />
            </div>
            
            {communication.sent && (
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-md flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Communication Sent</p>
                  <p className="text-emerald-700/80 mt-1">This communication has already been executed. Editing is locked.</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="readiness" className="p-0 m-0 focus-visible:ring-0">
            <div className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pre-flight Checks</h4>
                {isReadinessLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              
              {!readiness && !isReadinessLoading && (
                <p className="text-sm text-muted-foreground">Failed to load readiness checks.</p>
              )}
              
              {readiness && (
                <div className="space-y-3">
                  {readiness.checks.map(check => (
                    <div key={check.key} className={`flex items-start gap-3 p-3 rounded-md border ${check.passed ? 'bg-emerald-50/50 border-emerald-100' : check.blocking ? 'bg-destructive/5 border-destructive/20' : 'bg-amber-50/50 border-amber-100'}`}>
                      {check.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${check.blocking ? 'text-destructive' : 'text-amber-500'}`} />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${check.passed ? 'text-foreground' : check.blocking ? 'text-destructive' : 'text-amber-700'}`}>
                          {check.label}
                        </p>
                        {!check.passed && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            {check.blocking ? 'Must resolve before sending.' : 'Recommended to review.'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 mt-6 border-t flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">Status: {readiness.ready ? <span className="text-emerald-600">Ready to Send</span> : <span className="text-destructive">Needs Attention</span>}</h4>
                    </div>
                    <Button disabled={!readiness.ready || communication.sent} className="gap-2">
                      <Send className="h-4 w-4" />
                      {communication.sent ? 'Sent' : 'Submit for Approval'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
