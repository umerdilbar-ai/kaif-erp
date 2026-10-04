import { cn } from "@/lib/utils";
import type { Label } from "@/lib/labels";
import type { LucideIcon } from "lucide-react";

export type BigButtonVariant = "in" | "out" | "pending" | "neutral";

const VARIANTS: Record<BigButtonVariant, string> = {
  in: "bg-money-in text-white",
  out: "bg-money-out text-white",
  pending: "bg-pending text-white",
  neutral: "bg-brand text-white",
};

/** Huge tappable button. Pass `label` for trilingual text, or children. green=in, red=out, amber=pending. */
export function BigButton({
  variant = "neutral",
  label,
  icon: Icon,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BigButtonVariant;
  label?: Label;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-3 text-xl font-bold shadow-sm transition active:scale-[0.97] disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
    >
      {Icon && <Icon className="size-7 shrink-0" />}
      {label && (
        <span className="flex flex-col items-center leading-tight">
          <span>{label.roman}</span>
          <span className="font-urdu text-base font-normal">{label.ur}</span>
        </span>
      )}
      {children}
    </button>
  );
}
