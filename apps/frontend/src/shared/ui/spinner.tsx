import { LoaderCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin text-primary", className)} />;
}
