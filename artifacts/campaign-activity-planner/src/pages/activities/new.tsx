import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateWebinar, useListCampaigns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { GovernedSelect } from "@/components/governed-select";

export default function NewWebinar() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCampaignId = searchParams.get("campaignId") || "";

  const { data: campaigns, isLoading: campaignsLoading } = useListCampaigns();
  const createWebinar = useCreateWebinar();
  
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [formData, setFormData] = useState({
    subject: "",
    externalTitle: "",
    objective: "",
    successMeasure: "",
    segment: "",
    subsegment: "",
    persona: "Decision Maker",
    customerStatus: "All",
    geography: "",
    language: "EN",
    product: "",
    topic: "",
    eventDate: "",
    startTime: "10:00",
    durationMinutes: 60,
    timezone: "UTC",
    platform: "Zoom",
    registrationUrl: "",
    registrationPending: false,
    webinarOwner: "",
    emailMarketingOwner: "",
  });

  const [governedValid, setGovernedValid] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (campaigns && campaigns.length > 0 && initialCampaignId) {
      setCampaignId(initialCampaignId);
    } else if (campaigns && campaigns.length > 0 && !campaignId) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaigns, initialCampaignId]);

  const updateForm = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleValidationChange = (scope: string, isValid: boolean) => {
    setGovernedValid(prev => prev[scope] === isValid ? prev : { ...prev, [scope]: isValid });
  };

  const isGovernedValid = 
    !!governedValid["region"] && 
    !!governedValid["product"] && 
    !!governedValid["segment"] && 
    !!governedValid["business_objective"];

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!campaignId) { toast.error("Campaign is required"); return false; }
      if (!formData.subject.trim()) { toast.error("Internal Subject is required"); return false; }
      if (!formData.externalTitle.trim()) { toast.error("Public Title is required"); return false; }
      if (!governedValid["business_objective"]) { toast.error("Resolve Primary Objective governance errors"); return false; }
    } else if (currentStep === 2) {
      if (!formData.webinarOwner.trim()) { toast.error("Webinar Owner is required"); return false; }
      if (!formData.emailMarketingOwner.trim()) { toast.error("Email Marketing Owner is required"); return false; }
      if (!governedValid["segment"] || !governedValid["region"]) { toast.error("Resolve governance errors in Audience step"); return false; }
    } else if (currentStep === 3) {
      if (!formData.topic.trim()) { toast.error("Topic Area is required"); return false; }
      if (!governedValid["product"]) { toast.error("Resolve governance errors in Details step"); return false; }
    } else if (currentStep === 4) {
      if (!formData.eventDate) { toast.error("Choose an event date"); return false; }
      if (!formData.startTime) { toast.error("Choose a start time"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 4));
    }
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    
    createWebinar.mutate({
      campaignId,
      data: formData
    }, {
      onSuccess: (workspace) => {
        toast.success("Webinar planned successfully");
        const activityId = workspace.activities[workspace.activities.length - 1]?.id;
        setLocation(activityId ? `/activities/${activityId}` : `/campaigns/${workspace.campaign.id}`);
      },
      onError: (err) => {
        toast.error("Failed to create webinar. " + String(err));
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: "New Webinar Activity" }
        ]} />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Webinar</h1>
            <p className="text-muted-foreground mt-1">Plan a new webinar and auto-generate the communication journey.</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={() => setLocation(campaignId ? `/campaigns/${campaignId}` : '/campaigns')}>
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-start">
        <div className="w-full max-w-4xl mb-8 mt-4 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-muted -z-10"></div>
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Context' },
              { num: 2, label: 'Audience' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'Logistics' }
            ].map(s => (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-4">
                <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${step === s.num ? 'border-primary bg-primary text-primary-foreground' : step > s.num ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground text-muted-foreground bg-background'}`}>
                  {s.num}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${step === s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full max-w-4xl border-t-4 border-t-primary shadow-lg">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="p-8 space-y-6 animate-in slide-in-from-right-8">
                <div className="space-y-2">
                  <Label htmlFor="campaign">Parent Campaign</Label>
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger id="campaign" className="h-12 text-base">
                      <SelectValue placeholder="Select the campaign this webinar belongs to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignsLoading ? (
                        <SelectItem value="loading" disabled>Loading campaigns...</SelectItem>
                      ) : (
                        campaigns?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.shortTitle} ({c.campaignCode})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Internal Subject / Title</Label>
                  <Input 
                    id="subject" 
                    value={formData.subject} 
                    onChange={e => updateForm('subject', e.target.value)} 
                    placeholder="e.g., Q3 Enterprise Platform Demo"
                    className="h-12 text-base font-medium"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="externalTitle">Public Title</Label>
                  <Input 
                    id="externalTitle" 
                    value={formData.externalTitle} 
                    onChange={e => updateForm('externalTitle', e.target.value)} 
                    placeholder="e.g., Unlocking Scale: The New Platform Features"
                    className="h-12 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Primary Objective</Label>
                  <GovernedSelect
                    scope="business_objective"
                    value={formData.objective}
                    onValueChange={v => updateForm('objective', v)}
                    onValidationChange={handleValidationChange}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-8 space-y-6 animate-in slide-in-from-right-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="webinarOwner">Webinar Owner (Email/ID)</Label>
                    <Input 
                      id="webinarOwner" 
                      value={formData.webinarOwner} 
                      onChange={e => updateForm('webinarOwner', e.target.value)} 
                      placeholder="host@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="emailMarketingOwner">Email Marketing Owner (Email/ID)</Label>
                    <Input 
                      id="emailMarketingOwner" 
                      value={formData.emailMarketingOwner} 
                      onChange={e => updateForm('emailMarketingOwner', e.target.value)} 
                      placeholder="marketing@company.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Segment</Label>
                    <GovernedSelect
                      scope="segment"
                      value={formData.segment}
                      onValueChange={v => updateForm('segment', v)}
                      onValidationChange={handleValidationChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subsegment">Sub-segment (Optional)</Label>
                    <Input 
                      id="subsegment" 
                      value={formData.subsegment} 
                      onChange={e => updateForm('subsegment', e.target.value)} 
                      placeholder="e.g., Financial Services"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Target Persona</Label>
                    <Select value={formData.persona} onValueChange={v => updateForm('persona', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Decision Maker">Decision Maker</SelectItem>
                        <SelectItem value="Technical Evaluator">Technical Evaluator</SelectItem>
                        <SelectItem value="End User">End User</SelectItem>
                        <SelectItem value="Champion">Champion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer Status</Label>
                    <Select value={formData.customerStatus} onValueChange={v => updateForm('customerStatus', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">Prospects & Customers</SelectItem>
                        <SelectItem value="Prospects Only">Prospects Only</SelectItem>
                        <SelectItem value="Customers Only">Customers Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Geography</Label>
                    <GovernedSelect
                      scope="region"
                      value={formData.geography}
                      onValueChange={v => updateForm('geography', v)}
                      onValidationChange={handleValidationChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={formData.language} onValueChange={v => updateForm('language', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="ES">Spanish</SelectItem>
                        <SelectItem value="FR">French</SelectItem>
                        <SelectItem value="DE">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-8 space-y-6 animate-in slide-in-from-right-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Product Focus</Label>
                    <GovernedSelect
                      scope="product"
                      value={formData.product}
                      onValueChange={v => updateForm('product', v)}
                      onValidationChange={handleValidationChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic Area (Tags)</Label>
                    <Input 
                      id="topic" 
                      value={formData.topic} 
                      onChange={e => updateForm('topic', e.target.value)} 
                      placeholder="e.g., Cloud Migration, Security"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="successMeasure">Success Measure</Label>
                    <Input 
                      id="successMeasure" 
                      value={formData.successMeasure} 
                      onChange={e => updateForm('successMeasure', e.target.value)} 
                      placeholder="e.g., 500 registrants, 40% attendance rate"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="p-8 space-y-6 animate-in slide-in-from-right-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date</Label>
                    <Input 
                      id="eventDate" 
                      type="date" 
                      value={formData.eventDate} 
                      onChange={e => updateForm('eventDate', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input 
                      id="startTime" 
                      type="time" 
                      value={formData.startTime} 
                      onChange={e => updateForm('startTime', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={formData.timezone} onValueChange={v => updateForm('timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={String(formData.durationMinutes)} onValueChange={v => updateForm('durationMinutes', Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Minutes</SelectItem>
                        <SelectItem value="45">45 Minutes</SelectItem>
                        <SelectItem value="60">60 Minutes</SelectItem>
                        <SelectItem value="90">90 Minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Webinar Platform</Label>
                    <Select value={formData.platform} onValueChange={v => updateForm('platform', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Zoom">Zoom Webinar</SelectItem>
                        <SelectItem value="ON24">ON24</SelectItem>
                        <SelectItem value="Webex">Webex</SelectItem>
                        <SelectItem value="Teams">Cisco Teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="registrationUrl">Registration URL</Label>
                    <div className="flex gap-4 items-center">
                      <Input 
                        id="registrationUrl" 
                        type="url"
                        value={formData.registrationUrl} 
                        onChange={e => updateForm('registrationUrl', e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                        disabled={formData.registrationPending}
                      />
                      <label className="flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.registrationPending}
                          onChange={e => {
                            updateForm('registrationPending', e.target.checked);
                            if (e.target.checked) updateForm('registrationUrl', '');
                          }}
                          className="rounded border-input text-primary w-4 h-4 focus:ring-primary" 
                        />
                        Pending Generation
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">If pending, emails will be generated with placeholder tokens.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-8 py-4 bg-muted/20 border-t flex items-center justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack} 
                disabled={step === 1 || createWebinar.isPending}
              >
                Back
              </Button>
              
              {step < 4 ? (
                <Button type="button" onClick={handleNext} className="gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="gap-2" disabled={createWebinar.isPending}>
                  {createWebinar.isPending ? 'Generating Schedule...' : 'Plan Webinar Activity'}
                  {!createWebinar.isPending && <Send className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
