import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in fade-in">
      <div className="rounded-full bg-destructive/10 p-6 mb-6">
        <AlertCircle className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-3">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved to a different workspace.
      </p>
      <Link href="/">
        <Button size="lg" className="px-8 font-semibold">
          Return to Command Center
        </Button>
      </Link>
    </div>
  );
}
