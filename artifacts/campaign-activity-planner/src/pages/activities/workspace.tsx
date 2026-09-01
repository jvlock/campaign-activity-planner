import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetActivity,
  usePreviewReschedule,
  useConfirmReschedule,
  getGetActivityQueryKey,
  ReschedulePreview,
  useRegisterWebinarPerson,
  useRecordWebinarAttendance
} from "@workspace/api-client-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, AlertCircle, AlertTriangle, ArrowRight, MessageSquare, Edit, CheckCircle2, ChevronRight, Users, PlaySquare, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ActivityWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: workspace, isLoading, isFetching, error, refetch } = useGetActivity(id!);
  const queryClient = useQueryClient();

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleTimezone, setRescheduleTimezone] = useState("");
  const [previewData, setPreviewData] = useState<ReschedulePreview | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  
  // Registration state
  const [registerPersonId, setRegisterPersonId] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Attendance state
  const [attendPersonId, setAttendPersonId] = useState("");
  const [attendStatus, setAttendStatus] = useState<"Attended" | "No Show">("Attended");
  const [isAttendOpen, setIsAttendOpen] = useState(false);

  const previewReschedule = usePreviewReschedule();
  const confirmReschedule = useConfirmReschedule();
  const registerPerson = useRegisterWebinarPerson();
  const recordAttendance = useRecordWebinarAttendance();

  const handlePreviewReschedule = () => {
    if (!rescheduleDate) return;
    previewReschedule.mutate({
      activityId: id!,
      data: {
        eventDate: rescheduleDate,
        startTime: rescheduleTime || undefined,
        timezone: rescheduleTimezone || undefined,
      }
    }, {
      onSuccess: (data) => setPreviewData(data),
      onError: (err) => toast.error("Failed to preview reschedule. " + err)
    });
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleDate) return;
    confirmReschedule.mutate({
      activityId: id!,
      data: {
        eventDate: rescheduleDate,
        startTime: rescheduleTime || undefined,
        timezone: rescheduleTimezone || undefined,
      }
    }, {
      onSuccess: () => {
        toast.success("Activity and communications rescheduled successfully.");
        queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey(id!) });
        setIsRescheduleOpen(false);
        setPreviewData(null);
      },
      onError: (err) => toast.error("Failed to confirm reschedule. " + err)
    });
  };

  const handleRegister = () => {
    if (!registerPersonId) return;
    registerPerson.mutate({
      activityId: id!,
      data: { personReference: registerPersonId }
    }, {
      onSuccess: () => {
        toast.success("Person registered successfully.");
        setIsRegisterOpen(false);
        setRegisterPersonId("");
      },
      onError: (err) => toast.error("Failed to register. " + err)
    });
  };

  const handleAttendance = () => {
    if (!attendPersonId) return;
    recordAttendance.mutate({
      activityId: id!,
      data: { personReference: attendPersonId, attendanceStatus: attendStatus }
    }, {
      onSuccess: () => {
        toast.success("Attendance recorded successfully.");
        setIsAttendOpen(false);
        setAttendPersonId("");
      },
      onError: (err) => toast.error("Failed to record attendance. " + err)
    });
  };

  if (isLoading) {
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

  if (error || !workspace) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-destructive/50">
          <CardContent className="py-10 flex flex-col items-center text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h1 className="text-xl font-bold">Activity workspace is temporarily unavailable</h1>
            <p className="text-muted-foreground mt-2">Other planner areas remain available while this activity is reloaded.</p>
            <Button className="mt-5 gap-2" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Retry activity
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { activity, communications } = workspace;
  const sortedComms = [...communications].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0 z-10 shadow-sm">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: "Campaign", href: `/campaigns/${activity.campaignId}` },
          { label: activity.shortTitle }
        ]} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {activity.shortTitle}
              <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{activity.activityType}</Badge>
              <Badge variant={activity.lifecycleStatus === 'Active' ? 'default' : 'secondary'}>{activity.lifecycleStatus}</Badge>
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">{activity.internalTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Users className="h-4 w-4" /> Register Person</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register Person for Webinar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Use an opaque external person reference (e.g. UUID or hash). Never use email or other PII.
                  </div>
                  <div className="space-y-2">
                    <Label>Person Reference (Opaque ID)</Label>
                    <Input value={registerPersonId} onChange={e => setRegisterPersonId(e.target.value)} placeholder="e.g. usr_123abc" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancel</Button>
                  <Button onClick={handleRegister} disabled={registerPerson.isPending}>Register</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAttendOpen} onOpenChange={setIsAttendOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Record Attendance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Attendance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Use an opaque external person reference (e.g. UUID or hash). Never use email or other PII.
                  </div>
                  <div className="space-y-2">
                    <Label>Person Reference (Opaque ID)</Label>
                    <Input value={attendPersonId} onChange={e => setAttendPersonId(e.target.value)} placeholder="e.g. usr_123abc" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={attendStatus} onValueChange={(v: "Attended"|"No Show") => setAttendStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Attended">Attended</SelectItem>
                        <SelectItem value="No Show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAttendOpen(false)}>Cancel</Button>
                  <Button onClick={handleAttendance} disabled={recordAttendance.isPending}>Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isRescheduleOpen} onOpenChange={(open) => {
              setIsRescheduleOpen(open);
              if (open) {
                setRescheduleDate(activity.eventDate);
                setRescheduleTime(activity.startTime);
                setRescheduleTimezone(activity.timezone);
                setPreviewData(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Calendar className="h-4 w-4" /> Reschedule</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Reschedule Activity</DialogTitle>
                  <DialogDescription>
                    Changing the anchor date will automatically adjust all relatively scheduled communications.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>New Event Date</Label>
                      <Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Start Time</Label>
                      <Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Timezone</Label>
                      <Input value={rescheduleTimezone} onChange={e => setRescheduleTimezone(e.target.value)} />
                    </div>
                    <div className="sm:col-span-3 flex justify-end">
                      <Button onClick={handlePreviewReschedule} disabled={previewReschedule.isPending || !rescheduleDate || !rescheduleTime || !rescheduleTimezone}>
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
                  <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
                  <Button onClick={handleConfirmReschedule} disabled={!previewData || confirmReschedule.isPending}>
                    Confirm Reschedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/10 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg">Activity Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Date</span>
                  <p className="font-medium text-sm whitespace-nowrap">{format(parseISO(activity.eventDate), "MMMM d, yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</span>
                  <p className="font-medium text-sm whitespace-nowrap">{activity.startTime} {activity.timezone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Governance</span>
                  <p className="font-medium text-sm">{activity.governanceStatus}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</span>
                  <p className="font-medium text-sm">{activity.owner}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Communication Journey</h2>
            </div>
            
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border"></div>
              <div className="space-y-4">
                {sortedComms.map((comm) => (
                  <div key={comm.id} className="relative group">
                    <div className="absolute -left-6 top-3 h-[22px] w-[22px] rounded-full border-2 bg-background z-10 flex items-center justify-center border-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-transparent group-hover:bg-primary/30"></div>
                    </div>
                    
                    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{comm.channel}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
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
                        <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={() => setLocation(`/communications/${comm.id}`)}>
                          <Edit className="h-4 w-4" /> Edit Content
                        </Button>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
