import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetCommunication,
  useUpdateCommunication,
  useGetCommunicationReadiness,
  getGetCommunicationQueryKey,
} from "@workspace/api-client-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Send, RefreshCw, ArrowLeft, Clock, MapPin, Users, History, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function CommunicationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: commData, isLoading } = useGetCommunication(id!);
  const { data: readiness, isLoading: isReadinessLoading } = useGetCommunicationReadiness(id!);
  const updateComm = useUpdateCommunication();
  const queryClient = useQueryClient();

  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    preheader: "",
    body: "",
    header: "",
    primaryCtaLabel: "",
    secondaryCtaLabel: "",
    secondaryCtaUrl: "",
    destinationType: "",
    fromName: "",
    replyTo: "",
    communicationCode: "",
    owner: "",
    dynamicTokens: "",
    tokenFallbacks: "{}",
    utmParameters: "{}",
    dependencies: "",
    qaChecklist: {} as Record<string, boolean>
  });
  
  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (commData?.communication && initializedForId.current !== id) {
      initializedForId.current = id;
      const c = commData.communication;
      setFormData({
        subject: c.subject || "",
        preheader: c.preheader || "",
        body: c.body || "",
        header: c.header || "",
        primaryCtaLabel: c.primaryCtaLabel || "",
        secondaryCtaLabel: c.secondaryCtaLabel || "",
        secondaryCtaUrl: c.secondaryCtaUrl || "",
        destinationType: c.destinationType || "",
        fromName: c.fromName || "",
        replyTo: c.replyTo || "",
        communicationCode: c.communicationCode || "",
        owner: c.owner || "",
        dynamicTokens: c.dynamicTokens?.join(", ") || "",
        tokenFallbacks: c.tokenFallbacks ? JSON.stringify(c.tokenFallbacks, null, 2) : "{\n}",
        utmParameters: c.utmParameters ? JSON.stringify(c.utmParameters, null, 2) : "{\n}",
        dependencies: c.dependencies?.join(", ") || "",
        qaChecklist: c.qaChecklist || {}
      });
    }
  }, [commData, id]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSaveAll = () => {
    let processedTokens: string[] = [];
    let processedDependencies: string[] = [];
    let parsedFallbacks = {};
    let parsedUtms = {};

    try { processedTokens = formData.dynamicTokens.split(',').map(s => s.trim()).filter(Boolean); } catch (e) {}
    try { processedDependencies = formData.dependencies.split(',').map(s => s.trim()).filter(Boolean); } catch (e) {}
    try { parsedFallbacks = JSON.parse(formData.tokenFallbacks); } catch (e) { toast.error("Invalid JSON in Token Fallbacks"); return; }
    try { parsedUtms = JSON.parse(formData.utmParameters); } catch (e) { toast.error("Invalid JSON in UTM Parameters"); return; }

    const payload = {
      ...formData,
      dynamicTokens: processedTokens,
      dependencies: processedDependencies,
      tokenFallbacks: parsedFallbacks,
      utmParameters: parsedUtms,
    };

    updateComm.mutate({
      communicationId: id!,
      data: payload
    }, {
      onSuccess: (updatedComm) => {
        setIsDirty(false);
        toast.success("Changes saved successfully");
        queryClient.invalidateQueries({ queryKey: getGetCommunicationQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: ["getCommunicationReadiness", id!] });
      },
      onError: (err) => {
        toast.error("Failed to save changes. " + err);
      }
    });
  };

  if (isLoading || !commData) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-8 w-full max-w-5xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const { communication } = commData;
  const isEmail = communication.channel.toLowerCase() === 'email';

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0 z-10 shadow-sm">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: "Activity", href: `/activities/${communication.activityId}` },
          { label: "Communication" }
        ]} />
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {communication.shortTitle}
              <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{communication.channel}</Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-mono">{communication.internalTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-sm font-medium text-amber-600 flex items-center gap-1.5 animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                Unsaved changes
              </span>
            )}
            <Button 
              variant="default" 
              onClick={handleSaveAll} 
              disabled={!isDirty || updateComm.isPending}
              className="gap-2"
            >
              {updateComm.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {updateComm.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setLocation(`/activities/${communication.activityId}`)}>
              <ArrowLeft className="h-4 w-4" /> Back to Activity
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-muted/5 flex justify-center">
        <div className="w-full max-w-5xl bg-card border-x flex flex-col shadow-sm">
          <Tabs defaultValue="content" className="w-full flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b bg-muted/20 p-0 h-12 justify-start px-6 overflow-x-auto">
              <TabsTrigger value="header" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">Header & CTAs</TabsTrigger>
              <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">Content</TabsTrigger>
              <TabsTrigger value="sender" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">Sender & Owner</TabsTrigger>
              <TabsTrigger value="tokens" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">Tokens</TabsTrigger>
              <TabsTrigger value="tracking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">Tracking</TabsTrigger>
              <TabsTrigger value="strategy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent gap-2 whitespace-nowrap">Strategy</TabsTrigger>
              <TabsTrigger value="timing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent gap-2 whitespace-nowrap">Timing</TabsTrigger>
              <TabsTrigger value="qa" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent whitespace-nowrap">
                QA & Approval
                {communication.warningCount > 0 && (
                  <span className="ml-2 rounded-full bg-destructive text-destructive-foreground w-4 h-4 text-[10px] flex items-center justify-center">
                    {communication.warningCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-12 data-[state=active]:bg-transparent gap-2 whitespace-nowrap">History</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-auto p-8">
              <TabsContent value="header" className="m-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="header">Header Text</Label>
                  <Input id="header" value={formData.header} onChange={(e) => handleChange('header', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationType">Destination Type</Label>
                  <Input id="destinationType" value={formData.destinationType} onChange={(e) => handleChange('destinationType', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryCtaLabel">Primary CTA Label</Label>
                    <Input id="primaryCtaLabel" value={formData.primaryCtaLabel} onChange={(e) => handleChange('primaryCtaLabel', e.target.value)} disabled={communication.sent} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryCtaLabel">Secondary CTA Label</Label>
                    <Input id="secondaryCtaLabel" value={formData.secondaryCtaLabel} onChange={(e) => handleChange('secondaryCtaLabel', e.target.value)} disabled={communication.sent} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="secondaryCtaUrl">Secondary CTA URL</Label>
                    <Input id="secondaryCtaUrl" value={formData.secondaryCtaUrl} onChange={(e) => handleChange('secondaryCtaUrl', e.target.value)} disabled={communication.sent} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="m-0 space-y-6">
                {isEmail && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject Line</Label>
                      <Input 
                        id="subject" 
                        value={formData.subject} 
                        onChange={(e) => handleChange('subject', e.target.value)}
                        placeholder="Enter an engaging subject..."
                        disabled={communication.sent}
                        className="font-medium h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preheader" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Preheader</Label>
                      <Input 
                        id="preheader" 
                        value={formData.preheader} 
                        onChange={(e) => handleChange('preheader', e.target.value)}
                        placeholder="Inbox preview text..."
                        disabled={communication.sent}
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="body" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Message Body</Label>
                  <Textarea 
                    id="body" 
                    value={formData.body} 
                    onChange={(e) => handleChange('body', e.target.value)}
                    placeholder="Write the primary communication content..."
                    disabled={communication.sent}
                    className="min-h-[400px] font-sans resize-y p-4"
                  />
                </div>

                {communication.sent && (
                  <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-md flex items-start gap-3 mt-8">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Communication Sent</p>
                      <p className="text-emerald-700/80 mt-1">This communication has already been executed. Editing is locked.</p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sender" className="m-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input id="fromName" value={formData.fromName} onChange={(e) => handleChange('fromName', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply To Email</Label>
                  <Input id="replyTo" value={formData.replyTo} onChange={(e) => handleChange('replyTo', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Communication Owner</Label>
                  <Input id="owner" value={formData.owner} onChange={(e) => handleChange('owner', e.target.value)} disabled={communication.sent} />
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="m-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="dynamicTokens">Dynamic Tokens (comma separated)</Label>
                  <Input id="dynamicTokens" value={formData.dynamicTokens} onChange={(e) => handleChange('dynamicTokens', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenFallbacks">Token Fallbacks (JSON)</Label>
                  <Textarea id="tokenFallbacks" value={formData.tokenFallbacks} onChange={(e) => handleChange('tokenFallbacks', e.target.value)} disabled={communication.sent} className="min-h-[150px] font-mono" />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="m-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="communicationCode">Communication Code</Label>
                  <Input id="communicationCode" value={formData.communicationCode} onChange={(e) => handleChange('communicationCode', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utmParameters">UTM Parameters (JSON)</Label>
                  <Textarea id="utmParameters" value={formData.utmParameters} onChange={(e) => handleChange('utmParameters', e.target.value)} disabled={communication.sent} className="min-h-[150px] font-mono" />
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="m-0 space-y-6">
                <div className="space-y-2 mb-6">
                  <Label htmlFor="dependencies">Dependencies (comma separated)</Label>
                  <Input id="dependencies" value={formData.dependencies} onChange={(e) => handleChange('dependencies', e.target.value)} disabled={communication.sent} />
                </div>
                <div className="p-6 border rounded-md bg-muted/10 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Target Audience Branch</h3>
                  <p className="text-sm text-muted-foreground">This communication targets the <strong>{communication.audienceBranch}</strong> segment of the parent activity.</p>
                  
                  <div className="pt-4 border-t space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dynamic Fields Available</span>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono text-xs">{`{{firstName}}`}</Badge>
                      <Badge variant="secondary" className="font-mono text-xs">{`{{companyName}}`}</Badge>
                      <Badge variant="secondary" className="font-mono text-xs">{`{{eventDate}}`}</Badge>
                      <Badge variant="secondary" className="font-mono text-xs">{`{{joinUrl}}`}</Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timing" className="m-0 space-y-6">
                <div className="p-6 border rounded-md bg-muted/10 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Delivery Schedule</h3>
                  
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relative Rule</span>
                      <p className="font-medium text-sm">{communication.relativeRule}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculated Send Date</span>
                      <p className="font-medium text-sm text-primary">{communication.scheduledDate} at {communication.sendTime} {communication.timezone}</p>
                    </div>
                    {communication.adjustmentReason && (
                      <div className="col-span-2 space-y-1 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                        <span className="font-semibold">Schedule Adjusted</span>
                        <p>{communication.adjustmentReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qa" className="m-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Pre-flight Checks</h3>
                    {isReadinessLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  <div className="p-4 border rounded-md mb-6">
                    <h4 className="font-semibold mb-3">Manual QA Checklist</h4>
                    <div className="space-y-2">
                      {['Copy reviewed', 'Links tested', 'Tokens verified', 'Design approved'].map(item => (
                        <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.qaChecklist[item] || false}
                            onChange={(e) => {
                              const newChecklist = { ...formData.qaChecklist, [item]: e.target.checked };
                              handleChange('qaChecklist', newChecklist);
                            }}
                            className="rounded border-input text-primary w-4 h-4 focus:ring-primary"
                            disabled={communication.sent}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {!readiness && !isReadinessLoading && (
                    <p className="text-sm text-muted-foreground">Failed to load readiness checks.</p>
                  )}
                  
                  {readiness && (
                    <div className="space-y-3">
                      {readiness.checks.map(check => (
                        <div key={check.key} className={`flex items-start gap-3 p-4 rounded-md border ${check.passed ? 'bg-emerald-50/50 border-emerald-100' : check.blocking ? 'bg-destructive/5 border-destructive/20' : 'bg-amber-50/50 border-amber-100'}`}>
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
                      
                      <div className="pt-8 mt-4 border-t flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-foreground text-lg">
                            Status: {readiness.ready ? <span className="text-emerald-600">Ready to Send</span> : <span className="text-destructive">Needs Attention</span>}
                          </h4>
                        </div>
                        <Button disabled={!readiness.ready || communication.sent} className="gap-2 h-12 px-6">
                          <Send className="h-4 w-4" />
                          {communication.sent ? 'Sent' : 'Submit for Approval'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="history" className="m-0 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold">Content History</h3>
                  <Badge variant="outline">Version {communication.version || 1}</Badge>
                </div>
                
                {commData.contentHistory && commData.contentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {commData.contentHistory.map(history => (
                      <div key={history.id} className="p-4 border rounded-md bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Version {history.versionNumber}</span>
                          <span className="text-xs text-muted-foreground">{new Date(history.createdAt).toLocaleString()}</span>
                        </div>
                        {history.isCurrent && <Badge className="mb-2">Current</Badge>}
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {history.subject || history.body || "No content"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center p-8 border rounded-md">
                    No history recorded yet.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
