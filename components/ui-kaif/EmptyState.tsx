import { Inbox, type LucideIcon } from "lucide-react";
import type { Label } from "@/lib/labels";

export function EmptyState({
  label,
  icon: Icon = Inbox,
  children,
}: {
  label: Label;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-navy/60">
      <Icon className="size-20 opacity-40" />
      <p className="text-2xl font-bold">{label.roman}</p>
      <p className="font-urdu text-xl" dir="rtl">{label.ur}</p>
      <p className="text-base">{label.en}</p>
      {children}
    </div>
  );
}
