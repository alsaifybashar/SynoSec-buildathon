import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> & {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: "sm" | "md";
  className?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, indeterminate = false, onCheckedChange, size = "sm", className, disabled, ...props },
  forwardedRef
) {
  const internalRef = useRef<HTMLInputElement>(null);
  const showIndeterminate = indeterminate && !checked;

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = showIndeterminate;
    }
  }, [showIndeterminate]);

  const setRefs = (node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const ariaChecked: boolean | "mixed" = showIndeterminate ? "mixed" : checked;
  const filled = checked || showIndeterminate;
  const dimensions = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const iconDimensions = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";

  return (
    <label
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center",
        dimensions,
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input
        ref={setRefs}
        type="checkbox"
        aria-checked={ariaChecked}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...props}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-sm border bg-background transition-colors",
          dimensions,
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
          filled
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-foreground/40"
        )}
      >
        {showIndeterminate ? (
          <Minus className={iconDimensions} strokeWidth={3} />
        ) : checked ? (
          <Check className={iconDimensions} strokeWidth={3} />
        ) : null}
      </span>
    </label>
  );
});
