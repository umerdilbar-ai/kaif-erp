import type { Label } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Trilingual inline label: Roman Urdu big, Urdu script, small English. */
export function Tri({ label, className, en = true }: { label: Label; className?: string; en?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className="font-bold">{label.roman}</span>
      <span className="font-urdu text-sm leading-normal">{label.ur}</span>
      {en && <span className="text-xs opacity-60">{label.en}</span>}
    </span>
  );
}
