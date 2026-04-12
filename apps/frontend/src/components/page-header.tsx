import { ChevronRight } from "lucide-react";
import { Display } from "./ui/typography";

export function PageHeader({
  title,
  breadcrumbs
}: {
  title: string;
  breadcrumbs: string[];
}) {
  return (
    <div className="m-3 space-y-2.5">
      <div className="space-y-1.5">
        <Display className="max-w-none text-3xl md:text-5xl">{title}</Display>
      </div>

      <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb} className="flex items-center gap-2">
            {index > 0 ? <ChevronRight className="h-4 w-4" /> : null}
            <span className={index === breadcrumbs.length - 1 ? "font-medium text-foreground" : undefined}>{crumb}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
