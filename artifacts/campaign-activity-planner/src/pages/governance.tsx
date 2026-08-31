import { useGetGovernanceStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldAlert, ShieldCheck, Database, Server, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Governance() {
  const { data: status, isLoading } = useGetGovernanceStatus();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Governance Control
        </h1>
        <p className="text-muted-foreground mt-1">Manage synchronization with authoritative systems of record.</p>
      </div>

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
              {isLoading ? (
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
            <CardDescription>Current connection state to enterprise planner</CardDescription>
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
              <p className="font-semibold mb-2">Pending Authority Explanation:</p>
              <p className="text-muted-foreground leading-relaxed">
                When campaigns are created in this workspace, they begin in a "Pending" governance state. 
                They require a two-way sync with <strong>{status?.authoritativeSource || 'the system of record'}</strong> to receive an official tracking ID and budget allocation code. 
                Until synchronized, activities can be planned but final communications cannot be approved for dispatch.
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
              <p className="font-medium text-foreground">Audit History Unvailable</p>
              <p className="text-sm mt-1 max-w-xs">Detailed sync logs are preserved in the main governance repository.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
