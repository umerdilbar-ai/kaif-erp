import type { VoucherType } from "@/lib/types";
import { VouchersScreen } from "@/components/s3/VouchersScreen";

const MODES: VoucherType[] = ["RECEIPT", "PAYMENT", "EXPENSE"];

export default async function VouchersPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const initial = MODES.find((m) => m === mode) ?? null;
  return <VouchersScreen initialMode={initial} />;
}
