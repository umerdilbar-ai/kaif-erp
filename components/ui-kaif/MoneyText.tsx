import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/format";

export type MoneyIntent = "auto" | "in" | "out" | "pending" | "neutral";

const COLORS = {
  in: "text-money-in",
  out: "text-money-out",
  pending: "text-pending",
  neutral: "text-navy",
};

/**
 * Formatted Rs amount. intent="auto" (default): >0 green, <0 red, 0 neutral.
 * Force a color with in/out/pending/neutral. `abs` hides the minus sign.
 */
export function MoneyText({
  amount,
  intent = "auto",
  abs = false,
  className,
}: {
  amount: number | null | undefined;
  intent?: MoneyIntent;
  abs?: boolean;
  className?: string;
}) {
  const n = Number(amount ?? 0);
  const key = intent === "auto" ? (n > 0 ? "in" : n < 0 ? "out" : "neutral") : intent;
  return (
    <span className={cn("font-bold tabular-nums", COLORS[key], className)}>
      {formatPKR(abs ? Math.abs(n) : n)}
    </span>
  );
}
