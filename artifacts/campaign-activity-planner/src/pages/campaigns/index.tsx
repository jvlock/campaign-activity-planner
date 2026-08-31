import { Link } from "wouter";
import { useListCampaigns } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { Search, Plus, Target, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const [search, setSearch] = useState("");

  const filteredCampaigns = campaigns?.filter(c => 
    c.shortTitle.toLowerCase().includes(search.toLowerCase()) || 
    c.internalTitle.toLowerCase().includes(search.toLowerCase()) ||
    c.campaignCode?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Campaign Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Manage and track all integrated marketing campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2" data-testid="btn-new-campaign">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md">
        <div className="p-4 border-b bg-muted/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search campaigns..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-campaigns"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[300px]">Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Governance</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Activities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading campaigns...
                </TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground flex-col gap-2">
                  <div className="flex justify-center mb-2"><Search className="h-8 w-8 text-muted" /></div>
                  <p>No campaigns found.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Link href={`/campaigns/${campaign.id}`} className="block w-full">
                      <div className="font-semibold text-primary group-hover:underline line-clamp-1">{campaign.shortTitle}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{campaign.campaignCode || 'Draft'}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.lifecycleStatus === 'Active' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider font-bold">
                      {campaign.lifecycleStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      {campaign.governanceStatus}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono whitespace-nowrap text-muted-foreground">
                      {format(parseISO(campaign.startDate), "MMM d")} - {format(parseISO(campaign.endDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      {campaign.warningCount > 0 && (
                        <Badge variant="destructive" className="h-5 rounded-full px-2">
                          {campaign.warningCount} warn
                        </Badge>
                      )}
                      <span className="font-medium inline-block w-6 text-center">{campaign.activityCount}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
