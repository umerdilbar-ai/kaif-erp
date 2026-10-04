import type { Label } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Inline trilingual label: Roman big, Urdu, small English. */
export function Tri({ label, className, small }: { label: Label; className?: string; small?: boolean }) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-bold", small ? "text-lg" : "text-xl")}>{label.roman}</span>
      <span className={cn("font-urdu", small ? "text-base" : "text-lg")} dir="rtl">{label.ur}</span>
      <span className="text-sm opacity-60">{label.en}</span>
    </span>
  );
}
