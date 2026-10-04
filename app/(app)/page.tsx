"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, BookOpen, HandCoins, Receipt, ReceiptText, TrendingDown, TrendingUp, Truck, Wallet,
  type LucideIcon,
} from "lucide-react";
import { SplitPane } from "@/components/shell/SplitPane";
import { MoneyText, PageTitle } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { Label } from "@/lib/labels";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tri } from "@/components/s3/Tri";
import { fetchAll, loadLedger } from "@/components/s3/cash";
import { dayEndISO, dayStartISO, monthStart, today } from "@/components/s3/dates";
import { S } from "@/components/s3/labels";

interface Stats {
  todaySales: number;
  todayBills: number;
  cash: number;
  receivable: number;
  payable: number;
  lowStock: number;
  profitToday: number;
  profitMonth: number;
}

type SaleRow = {
  created_at: string;
  total: number;
  discount: number;
  invoice_items: { quantity: number; unit_price: number; cost_price?: number | null; items: { cost_price: number } | null }[];
};

const TILES: { href: string; label: Label; icon: LucideIcon; color: string }[] = [
  { href: "/sale", label: S.sale, icon: ReceiptText, color: "bg-green-700" },
  { href: "/purchase", label: S.purchase, icon: Truck, color: "bg-red-700" },
  { href: "/vouchers?mode=RECEIPT", label: S.cashIn, icon: HandCoins, color: "bg-emerald-700" },
  { href: "/vouchers?mode=EXPENSE", label: S.expense, icon: Receipt, color: "bg-red-800" },
];

async function loadStats(): Promise<Stats> {
  const sb = createClient();
  const t = today();
  const todayT = new Date(dayStartISO(t)).getTime();
  const [sales, expenses, parties, items, ledger] = await Promise.all([
    fetchAll<SaleRow>((a, b) =>
      sb.from("invoices").select("created_at,total,discount,invoice_items(*, items(cost_price))").eq("type", "SALE")
        .gte("created_at", dayStartISO(monthStart(t))).lt("created_at", dayEndISO(t)).range(a, b)),
    fetchAll<{ created_at: string; amount: number }>((a, b) =>
      sb.from("vouchers").select("created_at,amount").eq("type", "EXPENSE")
        .gte("created_at", dayStartISO(monthStart(t))).lt("created_at", dayEndISO(t)).range(a, b)),
    fetchAll<{ balance: number }>((a, b) => sb.from("parties").select("balance").neq("balance", 0).range(a, b)),
    fetchAll<{ current_stock: number; min_stock_alert: number }>((a, b) =>
      sb.from("items").select("current_stock,min_stock_alert").eq("is_active", true).range(a, b)),
    loadLedger(sb, t, t),
  ]);

  const isToday = (iso: string) => new Date(iso).getTime() >= todayT;
  // profit = Σ (unit_price − cost_price) × qty − discounts − expenses
  const saleProfit = (s: SaleRow) =>
    s.invoice_items.reduce(
      (sum, l) => sum + (Number(l.unit_price) - Number(l.cost_price ?? l.items?.cost_price ?? 0)) * Number(l.quantity),
      0
    ) - Number(s.discount);
  const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
  const todaySales = sales.filter((s) => isToday(s.created_at));
  const todayExp = expenses.filter((e) => isToday(e.created_at));

  return {
    todaySales: sum(todaySales, (s) => Number(s.total)),
    todayBills: todaySales.length,
    cash: ledger[0]?.closing ?? 0,
    receivable: sum(parties, (p) => Math.max(Number(p.balance), 0)),
    payable: sum(parties, (p) => Math.max(-Number(p.balance), 0)),
    lowStock: items.filter((i) => Number(i.current_stock) <= Number(i.min_stock_alert)).length,
    profitToday: sum(todaySales, saleProfit) - sum(todayExp, (e) => Number(e.amount)),
    profitMonth: sum(sales, saleProfit) - sum(expenses, (e) => Number(e.amount)),
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats().then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <SplitPane
      left={
        <div className="space-y-3">
          <PageTitle label={S.dashboard} />
          <div className="grid grid-cols-2 gap-3">
            {TILES.map((t) => (
              <Link key={t.href} href={t.href}
                className={cn("tile flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center text-white shadow active:scale-95", t.color)}>
                <t.icon className="size-16" />
                <Tri label={t.label} className="items-center text-2xl" />
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/invoices" className="tile flex min-h-20 items-center justify-center gap-2 rounded-2xl bg-cream text-navy">
              <ReceiptText className="size-8" /> <Tri label={S.invoices} en={false} />
            </Link>
            <Link href="/roznamcha" className="tile flex min-h-20 items-center justify-center gap-2 rounded-2xl bg-cream text-navy">
              <BookOpen className="size-8" /> <Tri label={S.roznamcha} en={false} />
            </Link>
          </div>
        </div>
      }
      right={
        <div className="space-y-3">
          {error && <p className="rounded-2xl bg-red-100 p-3 text-lg font-bold text-money-out">{error}</p>}
          {!stats ? (
            <p className="p-6 text-2xl text-navy/50">…</p>
          ) : (
            <>
              <div className="grid gap-3 min-[600px]:grid-cols-2">
                <ProfitCard amount={stats.profitToday} when={S.today} />
                <ProfitCard amount={stats.profitMonth} when={S.thisMonth} />
              </div>
              <div className="grid gap-3 min-[600px]:grid-cols-2">
                <Stat icon={ReceiptText} label={S.todaySale} className="bg-green-50 text-money-in"
                  value={formatPKR(stats.todaySales)} sub={`${stats.todayBills} ${S.bill.roman}`} />
                <Stat icon={Wallet} label={S.cashInHand} className="bg-cream text-navy" value={formatPKR(stats.cash)} />
                <Stat icon={HandCoins} label={S.lena} className="bg-amber-50 text-pending" value={formatPKR(stats.receivable)} />
                <Stat icon={Truck} label={S.dena} className="bg-red-50 text-money-out" value={formatPKR(stats.payable)} />
              </div>
              <Link href="/stock"
                className={cn("tile flex items-center gap-4 rounded-2xl p-4",
                  stats.lowStock > 0 ? "bg-pending text-white" : "bg-green-50 text-money-in")}>
                <AlertTriangle className="size-12 shrink-0" />
                <Tri label={S.lowStock} className="flex-1 text-2xl" />
                <span className="text-6xl font-extrabold tabular-nums">{stats.lowStock}</span>
              </Link>
            </>
          )}
        </div>
      }
    />
  );
}

function ProfitCard({ amount, when }: { amount: number; when: Label }) {
  const up = amount >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div className={cn("rounded-3xl p-4 text-white shadow", up ? "bg-money-in" : "bg-money-out")}>
      <div className="flex items-center gap-3">
        <Icon className="size-12 shrink-0" />
        <Tri label={up ? S.munafa : S.nuqsan} className="flex-1 text-2xl" />
        <Tri label={when} en={false} className="text-right text-lg opacity-90" />
      </div>
      <MoneyText amount={amount} abs intent="neutral" className="mt-2 block text-5xl text-white" />
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, className }: {
  icon: LucideIcon; label: Label; value: string; sub?: string; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl p-4", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-10 shrink-0" />
        <Tri label={label} className="text-xl" />
      </div>
      <p className="mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="text-lg opacity-80">{sub}</p>}
    </div>
  );
}
