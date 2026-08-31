import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCampaign } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { GovernedSelect } from "@/components/governed-select";

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const createCampaign = useCreateCampaign();
  
  const [formData, setFormData] = useState({
    shortTitle: "",
    objective: "",
    owner: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    product: "",
    geography: "",
    businessUnit: "Enterprise",
    campaignType: "Webinar",
    audienceSegment: "",
    fiscalPeriod: "Q1",
    description: "",
  });

  const [governedValid, setGovernedValid] = useState<Record<string, boolean>>({});

  const updateForm = (field: string, value: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGovernedValid) {
      toast.error("Please resolve governance errors before submitting.");
      return;
    }
    
    createCampaign.mutate({
      data: formData
    }, {
      onSuccess: (campaign) => {
        if (campaign.governanceStatus !== 'Authoritative') {
          toast.warning("Campaign created, but governance assignment is pending. You may need to retry later.");
        } else {
          toast.success("Campaign created and synchronized with governance.");
        }
        setLocation(`/campaigns/${campaign.id}`);
      },
      onError: (err) => {
        toast.error("Failed to create campaign. " + String(err));
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0">
        <Breadcrumb items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: "New Campaign" }
        ]} />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Create Campaign
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">Define the strategic container for your marketing activities.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setLocation('/campaigns')}>
            <ArrowLeft className="h-4 w-4" /> Back to Campaigns
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 flex justify-center">
        <Card className="w-full max-w-3xl border-t-4 border-t-primary shadow-md h-fit">
          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shortTitle">Campaign Title</Label>
                <Input 
                  id="shortTitle" 
                  value={formData.shortTitle} 
                  onChange={e => updateForm('shortTitle', e.target.value)} 
                  placeholder="e.g., Q3 Cloud Migration Push"
                  className="h-12 text-base font-medium"
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

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description} 
                  onChange={e => updateForm('description', e.target.value)} 
                  placeholder="Provide any additional context or background for this campaign..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="owner">Campaign Owner (Email/ID)</Label>
                  <Input 
                    id="owner" 
                    value={formData.owner} 
                    onChange={e => updateForm('owner', e.target.value)} 
                    placeholder="owner@company.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Business Unit</Label>
                  <Select value={formData.businessUnit} onValueChange={v => updateForm('businessUnit', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Public Sector">Public Sector</SelectItem>
                      <SelectItem value="Partners">Partners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
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
                  <Label>Geography</Label>
                  <GovernedSelect
                    scope="region"
                    value={formData.geography}
                    onValueChange={v => updateForm('geography', v)}
                    onValidationChange={handleValidationChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience Segment</Label>
                  <GovernedSelect
                    scope="segment"
                    value={formData.audienceSegment}
                    onValueChange={v => updateForm('audienceSegment', v)}
                    onValidationChange={handleValidationChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fiscal Period</Label>
                  <Select value={formData.fiscalPeriod} onValueChange={v => updateForm('fiscalPeriod', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                      <SelectItem value="H1">H1</SelectItem>
                      <SelectItem value="H2">H2</SelectItem>
                      <SelectItem value="FY">Full Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={formData.startDate} 
                    onChange={e => updateForm('startDate', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    value={formData.endDate} 
                    onChange={e => updateForm('endDate', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-muted/20 border-t flex justify-end">
              <Button type="submit" className="gap-2" disabled={createCampaign.isPending || !isGovernedValid}>
                {createCampaign.isPending ? 'Reserving Governance ID...' : 'Create Campaign'}
                {!createCampaign.isPending && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
