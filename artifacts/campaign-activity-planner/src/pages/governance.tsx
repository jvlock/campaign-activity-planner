import { useState } from "react";
import {
  useGetGovernanceStatus,
  useListCompanyAliases,
  useCreateCompanyAlias,
  useUpdateCompanyAlias,
  useDeleteCompanyAlias
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldAlert, ShieldCheck, Database, Server, RefreshCw, Building, Plus, Trash2, Edit2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function Governance() {
  const { data: status, isLoading: statusLoading } = useGetGovernanceStatus();
  const { data: aliases, isLoading: aliasesLoading } = useListCompanyAliases();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Governance Control
        </h1>
        <p className="text-muted-foreground mt-1">Manage synchronization and standardization policies.</p>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="system" className="gap-2"><Database className="h-4 w-4"/> System of Record</TabsTrigger>
          <TabsTrigger value="aliases" className="gap-2"><Building className="h-4 w-4"/> Company Aliases</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-primary shadow-md overflow-hidden relative">
              <div className="absolute right-0 top-0 p-8 opacity-5 text-primary pointer-events-none">
                <Database className="w-48 h-48" />
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    System of Record Status
                  </CardTitle>
                  {statusLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : status?.connected ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1.5 px-3 py-1">
                      <ShieldCheck className="h-4 w-4" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                      <ShieldAlert className="h-4 w-4" /> Disconnected
                    </Badge>
                  )}
                </div>
                <CardDescription>Current connection state to the authoritative governance service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Authoritative Source</span>
                    <p className="font-medium text-foreground">{status?.authoritativeSource || 'Loading...'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connection Label</span>
                    <p className="font-medium text-foreground">{status?.label || 'Loading...'}</p>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-md border text-sm">
                  <p className="font-semibold mb-2">{status?.connected ? 'Integration scope' : 'Pending authority explanation'}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {status?.connected
                      ? <>Authoritative campaigns and taxonomy can be read from <strong>{status.authoritativeSource}</strong>. New planner records remain pending until documented reservation and validation endpoints are available.</>
                      : <>Campaigns begin in a pending governance state and require synchronization with <strong>{status?.authoritativeSource || 'the system of record'}</strong> before final approval.</>}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Sync Audit Log</CardTitle>
                <CardDescription>Recent governance synchronization events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                  <Server className="h-10 w-10 text-muted mb-3" />
                  <p className="font-medium text-foreground">Audit History Unavailable</p>
                  <p className="text-sm mt-1 max-w-xs">Detailed sync logs are preserved in the main governance repository.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aliases" className="mt-6">
          <Card className="shadow-md border-t-4 border-t-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl">Company Name Normalization</CardTitle>
                <CardDescription>Standardize display names across all communications and reports.</CardDescription>
              </div>
              <AliasDialog />
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search aliases..." className="pl-9" />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Legal Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Aliases</TableHead>
                      <TableHead>SFDC ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aliasesLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Loading aliases...</TableCell></TableRow>
                    ) : aliases?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No aliases defined.</TableCell></TableRow>
                    ) : (
                      aliases?.map((alias) => (
                        <TableRow key={alias.id}>
                          <TableCell className="font-medium">{alias.legalName}</TableCell>
                          <TableCell>
                            {alias.approvedDisplayName ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">{alias.approvedDisplayName}</Badge>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {alias.aliases.slice(0, 2).join(", ")}
                            {alias.aliases.length > 2 && ` +${alias.aliases.length - 2} more`}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{alias.salesforceAccountId}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AliasDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    legalName: "",
    approvedDisplayName: "",
    salesforceAccountId: "",
    aliases: ""
  });

  const createAlias = useCreateCompanyAlias();
  const queryClient = useQueryClient();

  const handleSubmit = () => {
    createAlias.mutate({
      data: {
        ...formData,
        aliases: formData.aliases.split(',').map(s => s.trim()).filter(Boolean)
      }
    }, {
      onSuccess: () => {
        toast.success("Alias created successfully");
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/company-aliases"] });
        setFormData({ legalName: "", approvedDisplayName: "", salesforceAccountId: "", aliases: "" });
      },
      onError: (e) => toast.error("Failed to create alias: " + e)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Alias</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Company Alias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} placeholder="e.g. Acme Corporation Inc." />
          </div>
          <div className="space-y-2">
            <Label>Approved Display Name</Label>
            <Input value={formData.approvedDisplayName} onChange={e => setFormData({...formData, approvedDisplayName: e.target.value})} placeholder="e.g. Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Salesforce Account ID</Label>
            <Input value={formData.salesforceAccountId} onChange={e => setFormData({...formData, salesforceAccountId: e.target.value})} placeholder="001..." />
          </div>
          <div className="space-y-2">
            <Label>Known Aliases (comma separated)</Label>
            <Input value={formData.aliases} onChange={e => setFormData({...formData, aliases: e.target.value})} placeholder="Acme, AcmeInc, Acme Corp" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createAlias.isPending || !formData.legalName}>Save Alias</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
