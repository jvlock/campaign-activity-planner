import { useEffect } from "react";
import { useGetGovernanceTaxonomy } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GovernedSelectProps {
  scope: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onValidationChange?: (scope: string, isValid: boolean) => void;
}

export function GovernedSelect({ scope, value, onValueChange, placeholder, disabled, onValidationChange }: GovernedSelectProps) {
  const { data: taxonomy, isLoading, error, refetch } = useGetGovernanceTaxonomy(scope);

  const isSelectable = (status: string) => !["retired", "superseded", "inactive"].includes(status.toLowerCase());
  const isAvailable = taxonomy?.connected && taxonomy.values.length > 0;
  
  useEffect(() => {
    if (onValidationChange) {
      const isValid = !isLoading && !error && !!isAvailable;
      onValidationChange(scope, isValid);
    }
  }, [isLoading, error, isAvailable, scope, onValidationChange]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading governance values...</span>
      </div>
    );
  }

  if (error || !taxonomy?.connected) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 h-10 px-3 py-2 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Governance unavailable for {scope}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="w-fit">
          Retry Sync
        </Button>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 h-10 px-3 py-2 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>No approved values for {scope}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="w-fit">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={!value ? "text-muted-foreground" : ""}>
        <SelectValue placeholder={placeholder || `Select ${scope}...`} />
      </SelectTrigger>
      <SelectContent>
        {taxonomy.values.map((v) => (
          <SelectItem key={v.stableKey} value={v.stableKey} disabled={!isSelectable(v.status)}>
            {v.displayName} {v.status.toLowerCase() === "draft" ? "(Draft governed value)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}