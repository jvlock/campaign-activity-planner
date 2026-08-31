import { useState } from "react";
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

export default function NewWebinar() {
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading: campaignsLoading } = useListCampaigns();
  const createWebinar = useCreateWebinar();
  
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState("");
  const [formData, setFormData] = useState({
    subject: "",
    externalTitle: "",
    objective: "",
    segment: "Enterprise",
    geography: "NA",
    language: "EN",
    product: "Platform",
    topic: "",
    eventDate: new Date().toISOString().split('T')[0],
    startTime: "10:00",
    durationMinutes: 60,
    timezone: "UTC",
    platform: "Zoom",
  });

  const updateForm = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) {
      toast.error("Please select a campaign");
      return;
    }
    
    createWebinar.mutate({
      campaignId,
      data: formData
    }, {
      onSuccess: (workspace) => {
        toast.success("Webinar planned successfully");
        setLocation(`/campaigns/${workspace.campaign.id}`);
      },
      onError: (err) => {
        toast.error("Failed to create webinar. " + String(err));
      }
    });
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-[calc(100vh-3.5rem)] flex flex-col justify-center animate-in fade-in duration-500">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4 -ml-4 gap-2 text-muted-foreground" onClick={() => setLocation('/campaigns')}>
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Webinar Activity</h1>
        <p className="text-muted-foreground mt-2">Plan a new webinar using the guided framework. This will automatically generate the required operational schedule and email journey.</p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-muted -z-10"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center gap-2 bg-background px-2">
            <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${step === i ? 'border-primary bg-primary text-primary-foreground' : step > i ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground text-muted-foreground bg-background'}`}>
              {i}
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wider ${step === i ? 'text-primary' : 'text-muted-foreground'}`}>
              {i === 1 ? 'Context' : i === 2 ? 'Details' : 'Logistics'}
            </span>
          </div>
        ))}
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg">
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
                <Textarea 
                  id="objective" 
                  value={formData.objective} 
                  onChange={e => updateForm('objective', e.target.value)} 
                  placeholder="What is the goal of this webinar?"
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-8 space-y-6 animate-in slide-in-from-right-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Target Segment</Label>
                  <Select value={formData.segment} onValueChange={v => updateForm('segment', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                      <SelectItem value="Mid-Market">Mid-Market</SelectItem>
                      <SelectItem value="SMB">SMB</SelectItem>
                      <SelectItem value="Public Sector">Public Sector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Geography</Label>
                  <Select value={formData.geography} onValueChange={v => updateForm('geography', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NA">North America (NA)</SelectItem>
                      <SelectItem value="EMEA">Europe, Middle East, Africa (EMEA)</SelectItem>
                      <SelectItem value="APAC">Asia-Pacific (APAC)</SelectItem>
                      <SelectItem value="LATAM">Latin America (LATAM)</SelectItem>
                    </SelectContent>
                  </Select>
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
                
                <div className="space-y-2">
                  <Label>Product Focus</Label>
                  <Select value={formData.product} onValueChange={v => updateForm('product', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Platform">Platform Core</SelectItem>
                      <SelectItem value="Analytics">Analytics Suite</SelectItem>
                      <SelectItem value="Security">Security Add-on</SelectItem>
                      <SelectItem value="Integrations">Integrations Hub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic Area (Tags)</Label>
                <Input 
                  id="topic" 
                  value={formData.topic} 
                  onChange={e => updateForm('topic', e.target.value)} 
                  placeholder="e.g., Cloud Migration, Security, Best Practices"
                  required
                />
              </div>
            </div>
          )}

          {step === 3 && (
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
                
                <div className="space-y-2 col-span-2">
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
            
            {step < 3 ? (
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
  );
}
