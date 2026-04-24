import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.28em] text-primary", className)} {...props} />;
}

export function Display({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("max-w-4xl text-4xl font-bold tracking-tight text-foreground md:text-6xl", className)} {...props} />;
}

export function Lead({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("max-w-2xl text-base leading-7 text-muted-foreground md:text-lg", className)} {...props} />;
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold tracking-tight", className)} {...props} />;
}
