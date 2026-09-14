import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const WORKSPACE_URL = "https://replit.com/t/msci/repls/StaidCrazyPriority";

export function RetirementNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <section
      aria-label="Tool retirement notice"
      className="flex shrink-0 items-start gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 md:px-6"
      data-testid="retirement-notice"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
      <div className="min-w-0 flex-1 text-sm leading-6">
        <p className="font-medium">
          This tool is being retired. Campaign and activity planning are moving to the new Campaign Operating Workspace.
        </p>
        <a
          href={WORKSPACE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-semibold underline underline-offset-4 hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
        >
          Open Campaign Operating Workspace
        </a>
      </div>
      <button
        type="button"
        aria-label="Dismiss retirement notice"
        onClick={() => setDismissed(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </section>
  );
}