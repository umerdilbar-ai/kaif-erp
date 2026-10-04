import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayEndISO, dayOf, dayStartISO, parseDay } from "./dates";

/** Reads every page of a query (PostgREST caps responses at 1000 rows). */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export type CashKind = "SALE" | "PURCHASE" | "RECEIPT" | "PAYMENT" | "EXPENSE";
export interface CashEntry {
  id: string;
  at: string;
  kind: CashKind;
  dir: "in" | "out";
  amount: number;
  no: number;
  who: string;
  note: string | null;
  invoiceId: string | null;
}
export interface CashDayRow {
  day: string;
  opening: number;
  fixed: boolean; // opening was typed in (cash_days row) vs carried from the day before
  in: number;
  out: number;
  closing: number;
  entries: CashEntry[];
}

type Named = { name: string } | null;

/** Cash movements: SALE paid + RECEIPT in; PURCHASE paid + PAYMENT + EXPENSE out. */
export async function loadCashEntries(sb: SupabaseClient, fromISO: string | null, toISO: string): Promise<CashEntry[]> {
  const [invs, vchs] = await Promise.all([
    fetchAll<{ id: string; created_at: string; type: "SALE" | "PURCHASE"; invoice_no: number; paid: number; customer_name: string | null; parties: Named }>(
      (a, b) => {
        let q = sb.from("invoices").select("id,created_at,type,invoice_no,paid,customer_name,parties(name)")
          .in("type", ["SALE", "PURCHASE"]).gt("paid", 0).lt("created_at", toISO);
        if (fromISO) q = q.gte("created_at", fromISO);
        return q.order("created_at").range(a, b);
      }
    ),
    fetchAll<{ id: string; created_at: string; type: "RECEIPT" | "PAYMENT" | "EXPENSE"; voucher_no: number; amount: number; expense_category: string | null; description: string | null; parties: Named }>(
      (a, b) => {
        let q = sb.from("vouchers").select("id,created_at,type,voucher_no,amount,expense_category,description,parties(name)")
          .lt("created_at", toISO);
        if (fromISO) q = q.gte("created_at", fromISO);
        return q.order("created_at").range(a, b);
      }
    ),
  ]);
  const entries: CashEntry[] = [
    ...invs.map((i) => ({
      id: i.id, at: i.created_at, kind: i.type, dir: i.type === "SALE" ? "in" as const : "out" as const,
      amount: Number(i.paid), no: i.invoice_no, who: i.parties?.name ?? i.customer_name ?? "", note: null, invoiceId: i.id,
    })),
    ...vchs.map((v) => ({
      id: v.id, at: v.created_at, kind: v.type, dir: v.type === "RECEIPT" ? "in" as const : "out" as const,
      amount: Number(v.amount), no: v.voucher_no, who: v.parties?.name ?? v.expense_category ?? "",
      note: v.description, invoiceId: null,
    })),
  ];
  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Day-by-day cash from `fromDay` to `toDay`. A day's opening is its cash_days row if one exists,
 * otherwise the previous day's closing (chained back to the latest cash_days row, or 0).
 */
export async function loadLedger(sb: SupabaseClient, fromDay: string, toDay: string): Promise<CashDayRow[]> {
  const { data } = await sb.from("cash_days").select("day,opening_cash").lte("day", toDay).order("day");
  const days = (data as { day: string; opening_cash: number }[]) ?? [];
  const fixed = new Map(days.map((d) => [d.day, Number(d.opening_cash)]));
  const anchor = days.filter((d) => d.day <= fromDay).at(-1);

  const entries = await loadCashEntries(sb, anchor ? dayStartISO(anchor.day) : null, dayEndISO(toDay));
  const fromT = parseDay(fromDay).getTime();
  let running = anchor ? Number(anchor.opening_cash) : 0;
  const byDay = new Map<string, CashEntry[]>();
  for (const e of entries) {
    if (new Date(e.at).getTime() < fromT) running += e.dir === "in" ? e.amount : -e.amount;
    else {
      const d = dayOf(e.at);
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
  }

  const rows: CashDayRow[] = [];
  for (let d = fromDay; d <= toDay; d = addDays(d, 1)) {
    const list = byDay.get(d) ?? [];
    const opening = fixed.get(d) ?? running;
    const cin = list.filter((e) => e.dir === "in").reduce((s, e) => s + e.amount, 0);
    const cout = list.filter((e) => e.dir === "out").reduce((s, e) => s + e.amount, 0);
    running = opening + cin - cout;
    rows.push({ day: d, opening, fixed: fixed.has(d), in: cin, out: cout, closing: running, entries: list });
  }
  return rows;
}
