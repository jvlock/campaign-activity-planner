import { Link, useLocation } from "wouter";
import { LayoutDashboard, Megaphone, ShieldCheck, Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/governance", label: "Governance", icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-sidebar-primary tracking-tight">
            <Target className="h-6 w-6" />
            <span>Activity Planner</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <Link
            href="/new"
            className="flex items-center justify-center gap-2 rounded-md bg-sidebar-primary px-3 py-2 text-sm font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors shadow-sm"
            data-testid="nav-new-webinar"
          >
            <Plus className="h-4 w-4" />
            New Webinar
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center border-b bg-card px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary tracking-tight">
            <Target className="h-5 w-5" />
            <span>Activity Planner</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
