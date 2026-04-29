import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-mono text-eyebrow font-medium uppercase tracking-eyebrow text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function MetaLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "font-mono text-eyebrow font-medium uppercase tracking-badge text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function BadgeText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-mono text-eyebrow font-semibold uppercase tracking-caps", className)}
      {...props}
    />
  );
}

export function Display({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "max-w-4xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl",
        className
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("max-w-2xl text-base leading-7 text-muted-foreground md:text-lg", className)}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("font-display text-xl font-semibold tracking-tight", className)} {...props} />
  );
}
