import * as React from "react"
import { ChevronRight } from "lucide-react"

export interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex text-sm text-muted-foreground font-medium mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center">
              {item.href && !isLast ? (
                <a href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
              {!isLast && <ChevronRight className="ml-2 h-4 w-4" />}
            </li>
          );
        })}
      </ol>
    </nav>
  )
}
