"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, BellRing, FileText, MessageCircle, Pencil, Phone, Plus, Save, Truck, User, X,
} from "lucide-react";
import type { Invoice, Party, PartyType, Voucher } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, MoneyText, NumPad, PageTitle, SearchBox, useDing } from "@/components/ui-kaif";
import { L, NumField, Tri, sb, useToast } from "@/components/s2";

type Entry = {
  id: string;
  at: string;
  title: string;
  sub: string;
  effect: number; // change to party balance (BALANCE RULE)
  running: number;
};

/** "0300-1234567" -> "923001234567" for wa.me */
function waNumber(phone: string | null) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "92" + d.slice(1);
  else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return d;
}

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "2-digit" });

export function PartiesScreen() {
  const ding = useDing();
  const { show, toast } = useToast();
  const [tab, setTab] = useState<PartyType>("CUSTOMER");
  const [parties, setParties] = useState<Party[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Party | null>(null);
  const [mode, setMode] = useState<"view" | "new" | "edit">("view");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [opening, setOpening] = useState(0);

  const [form, setForm] = useState({ name: "", phone: "", credit_limit: "" });
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadParties = useCallback(async () => {
    const { data } = await sb().from("parties").select("*").order("name");
    const list = (data as Party[]) ?? [];
    setParties(list);
    setSel((s) => (s ? list.find((p) => p.id === s.id) ?? null : null));
  }, []);

  const loadLedger = useCallback(async (p: Party) => {
    const [inv, vch] = await Promise.all([
      sb().from("invoices").select("*").eq("party_id", p.id).in("type", ["SALE", "PURCHASE"]),
      sb().from("vouchers").select("*").eq("party_id", p.id),
    ]);
    const rows: Omit<Entry, "running">[] = [
      ...((inv.data as Invoice[]) ?? []).map((i) => {
        const due = Number(i.total) - Number(i.paid);
        return {
          id: i.id, at: i.created_at,
          title: `${i.type === "SALE" ? L.sale.roman : L.purchase.roman} #${i.invoice_no}`,
          sub: `${L.total.roman} ${formatPKR(i.total)} · ${L.paid.roman} ${formatPKR(i.paid)}`,
          effect: i.type === "SALE" ? due : -due,
        };
      }),
      ...((vch.data as Voucher[]) ?? []).map((v) => ({
        id: v.id, at: v.created_at,
        title: `${v.type === "RECEIPT" ? L.cashIn.roman : L.payment.roman} #${v.voucher_no}`,
        sub: v.description ?? "",
        effect: v.type === "RECEIPT" ? -Number(v.amount) : Number(v.amount),
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const start = Number(p.balance) - rows.reduce((s, r) => s + r.effect, 0);
    let run = start;
    const withRun = rows.map((r) => ({ ...r, running: (run += r.effect) }));
    setOpening(start);
    setEntries(withRun.reverse());
  }, []);

  useEffect(() => { loadParties(); }, [loadParties]);
  useEffect(() => { if (sel) loadLedger(sel); }, [sel, loadLedger]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return parties.filter((p) => p.type === tab && (!s || p.name.toLowerCase().includes(s) || (p.phone ?? "").includes(s)));
  }, [parties, tab, q]);

  function pick(p: Party) {
    setSel(p);
    setMode("view");
    setPayOpen(false);
  }
  function startNew() {
    setSel(null);
    setMode("new");
    setForm({ name: "", phone: "", credit_limit: "" });
  }
  function startEdit() {
    if (!sel) return;
    setForm({ name: sel.name, phone: sel.phone ?? "", credit_limit: sel.credit_limit ? String(sel.credit_limit) : "" });
    setMode("edit");
  }

  async function saveParty() {
    if (!form.name.trim()) return show("Naam likho / Enter a name", "err");
    setBusy(true);
    const row = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
    };
    const res = mode === "new"
      ? await sb().from("parties").insert({ ...row, type: tab }).select().single<Party>()
      : await sb().from("parties").update(row).eq("id", sel!.id).select().single<Party>();
    setBusy(false);
    if (res.error) return show(res.error.message, "err");
    ding();
    show(`${L.saved.roman} ✓`);
    await loadParties();
    pick(res.data);
  }

  async function savePayment() {
    if (!sel) return;
    const n = Number(amount);
    if (!n) return show("Raqam likho / Enter amount", "err");
    setBusy(true);
    const { error } = await sb().rpc("create_voucher", {
      p_type: sel.type === "CUSTOMER" ? "RECEIPT" : "PAYMENT",
      p_party_id: sel.id, p_expense_category: null, p_amount: n, p_description: note.trim() || null,
    });
    setBusy(false);
    if (error) return show(error.message, "err");
    ding();
    show(`${formatPKR(n)} ${L.saved.roman} ✓`);
    setPayOpen(false);
    setAmount("");
    setNote("");
    loadParties();
  }

  const tabBtn = (t: PartyType, label: typeof L.grahak, Icon: typeof User) => (
    <button type="button" onClick={() => { setTab(t); setSel(null); setMode("view"); }}
      className={cn("flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl text-xl font-bold",
        tab === t ? "bg-brand text-white" : "bg-cream text-navy")}>
      <Icon className="size-7" />
      <span className="flex flex-col leading-tight"><span>{label.roman}</span><span className="font-urdu text-base font-normal">{label.ur}</span></span>
    </button>
  );

  const left = (
    <div className="space-y-3">
      <PageTitle label={L.parties} />
      <div className="flex gap-2">
        {tabBtn("CUSTOMER", L.grahak, User)}
        {tabBtn("SUPPLIER", L.bapaari, Truck)}
      </div>
      <SearchBox value={q} onChange={setQ} />
      <BigButton variant="in" icon={Plus} label={L.newParty} onClick={startNew} className="w-full" />
      {list.length === 0 && <EmptyState label={L.nothingHere} />}
      <ul className="space-y-2">
        {list.map((p) => {
          const b = Number(p.balance);
          const over = p.type === "CUSTOMER" && p.credit_limit != null && Number(p.credit_limit) > 0 && b > Number(p.credit_limit);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)}
                className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left active:scale-[0.99]",
                  sel?.id === p.id ? "border-brand bg-brand/5" : "border-transparent bg-cream/60")}>
                {p.type === "CUSTOMER" ? <User className="size-9 shrink-0 text-brand" /> : <Truck className="size-9 shrink-0 text-brand" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-xl font-bold">
                    {p.name}{over && <AlertTriangle className="size-5 shrink-0 text-money-out" />}
                  </span>
                  {p.phone && <span className="block text-base text-navy/60">{p.phone}</span>}
                </span>
                {b !== 0 ? (
                  <span className={cn("rounded-xl px-3 py-1 text-right text-white", b > 0 ? "bg-pending" : "bg-money-out")}>
                    <span className="block text-lg font-extrabold tabular-nums">{formatPKR(Math.abs(b))}</span>
                    <span className="block text-sm">{b > 0 ? L.lena.roman : L.dena.roman}</span>
                  </span>
                ) : (
                  <span className="rounded-xl bg-money-in/10 px-3 py-1 text-base font-bold text-money-in">✓ {L.clear.roman}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const partyForm = (
    <div className="space-y-4">
      <PageTitle label={mode === "new" ? { ...L.newParty, roman: `${L.newParty.roman} (${tab === "CUSTOMER" ? L.grahak.roman : L.bapaari.roman})` } : L.edit} />
      <label className="block space-y-1">
        <Tri label={L.name} small />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="h-16 w-full rounded-2xl border-2 border-brand/30 px-4 text-2xl font-bold focus:border-brand focus:outline-none" />
      </label>
      <label className="block space-y-1">
        <Tri label={L.phone} small />
        <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="03xx-xxxxxxx"
          className="h-16 w-full rounded-2xl border-2 border-brand/30 px-4 text-2xl font-bold tabular-nums focus:border-brand focus:outline-none" />
      </label>
      {(mode === "new" ? tab : sel?.type) === "CUSTOMER" && (
        <NumField label={L.creditLimit} prefix="Rs" value={form.credit_limit} onChange={(v) => setForm({ ...form, credit_limit: v })} />
      )}
      <div className="flex gap-2">
        <BigButton variant="in" icon={Save} label={L.save} disabled={busy} onClick={saveParty} className="flex-1" />
        <BigButton variant="neutral" icon={X} label={L.cancel} onClick={() => setMode("view")} className="bg-cream text-navy" />
      </div>
    </div>
  );

  let right: React.ReactNode;
  if (mode !== "view") right = partyForm;
  else if (!sel) right = <EmptyState label={L.pickParty} icon={User} />;
  else {
    const b = Number(sel.balance);
    const isCust = sel.type === "CUSTOMER";
    const over = isCust && sel.credit_limit != null && Number(sel.credit_limit) > 0 && b > Number(sel.credit_limit);
    const wa = waNumber(sel.phone);
    const msg =
      `Assalam-o-Alaikum ${sel.name} sahib, Kaif Pipes ki taraf se yaad-dihani: ` +
      `aap ke zimme ${formatPKR(b)} baqi hain. Meharbani farma kar jald ada kar dein. Shukriya!`;
    right = (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isCust ? <User className="size-12 text-brand" /> : <Truck className="size-12 text-brand" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-3xl font-extrabold">{sel.name}</p>
            <p className="text-lg text-navy/60">
              {isCust ? L.grahak.roman : L.bapaari.roman}{sel.phone && ` · ${sel.phone}`}
              {isCust && sel.credit_limit ? ` · ${L.creditLimit.roman} ${formatPKR(sel.credit_limit)}` : ""}
            </p>
          </div>
          <button type="button" aria-label="Edit" onClick={startEdit}
            className="flex size-14 items-center justify-center rounded-2xl bg-cream text-navy"><Pencil className="size-7" /></button>
        </div>

        {sel.phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-xl font-bold text-white">
              <MessageCircle className="size-7" /> WhatsApp
            </a>
            <a href={`tel:${sel.phone}`}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-navy text-xl font-bold text-white">
              <Phone className="size-7" /> {L.call.roman}
            </a>
          </div>
        )}

        <div className={cn("rounded-3xl p-5 text-center text-white",
          b > 0 ? "bg-pending" : b < 0 ? "bg-money-out" : "bg-money-in")}>
          <p className="text-5xl font-extrabold tabular-nums">{formatPKR(Math.abs(b))}</p>
          <p className="mt-1 text-2xl font-bold">
            {b > 0 ? L.lena.roman : b < 0 ? L.dena.roman : L.clear.roman}{" "}
            <span className="font-urdu font-normal">{b > 0 ? L.lena.ur : b < 0 ? L.dena.ur : L.clear.ur}</span>
          </p>
        </div>

        {over && (
          <div className="flex items-center gap-3 rounded-2xl bg-money-out p-4 text-white">
            <AlertTriangle className="size-10 shrink-0" />
            <div>
              <p className="text-2xl font-extrabold">{L.overLimit.roman}</p>
              <p className="font-urdu text-lg" dir="rtl">{L.overLimit.ur}</p>
              <p className="text-base">{L.creditLimit.roman}: {formatPKR(sel.credit_limit)}</p>
            </div>
          </div>
        )}

        {payOpen ? (
          <div className="space-y-3 rounded-2xl border-4 border-money-in/40 p-4">
            <div className="flex items-center justify-between">
              <Tri label={isCust ? L.vasooli : L.adaigi} />
              <button type="button" aria-label="Close" onClick={() => setPayOpen(false)}
                className="flex size-12 items-center justify-center rounded-full bg-cream"><X className="size-6" /></button>
            </div>
            <div className="flex h-20 items-center justify-end rounded-2xl bg-cream/60 px-4 text-5xl font-extrabold tabular-nums text-money-in">
              Rs {amount || "0"}
            </div>
            <NumPad value={amount} onChange={setAmount} allowDecimal={false} />
            {b !== 0 && (
              <button type="button" onClick={() => setAmount(String(Math.abs(b)))}
                className="min-h-12 w-full rounded-xl bg-cream text-lg font-bold text-navy">
                Poora: {formatPKR(Math.abs(b))}
              </button>
            )}
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`${L.notes.roman} / ${L.notes.en}`}
              className="h-14 w-full rounded-2xl border-2 border-brand/30 px-4 text-xl" />
            <BigButton variant={isCust ? "in" : "out"} icon={Save} label={L.save} disabled={busy || !Number(amount)}
              onClick={savePayment} className="min-h-20 w-full text-2xl" />
          </div>
        ) : (
          <BigButton variant={isCust ? "in" : "out"} icon={isCust ? ArrowDownLeft : ArrowUpRight}
            label={isCust ? L.vasooli : L.adaigi} onClick={() => setPayOpen(true)} className="min-h-24 w-full text-3xl" />
        )}

        {isCust && b > 0 && wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border-4 border-[#25D366] text-xl font-bold text-[#128C7E]">
            <BellRing className="size-7" />
            <span className="flex flex-col leading-tight"><span>{L.reminder.roman}</span><span className="font-urdu text-base font-normal">{L.reminder.ur}</span></span>
          </a>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand"><FileText className="size-7" /><Tri label={L.ledger} /></div>
          {entries.length === 0 && opening === 0 ? <EmptyState label={L.nothingHere} /> : (
            <ul className="divide-y divide-navy/10">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{e.title}</p>
                    <p className="text-base text-navy/60">{fmtDate(e.at)}{e.sub && ` · ${e.sub}`}</p>
                  </div>
                  <div className="text-right">
                    <MoneyText amount={e.effect}
                      intent={e.effect === 0 ? "neutral" : isCust ? (e.effect > 0 ? "pending" : "in") : (e.effect < 0 ? "out" : "in")}
                      className="block text-xl" />
                    <span className="text-sm text-navy/60">= {formatPKR(e.running)}</span>
                  </div>
                </li>
              ))}
              {opening !== 0 && (
                <li className="flex items-center gap-3 py-3">
                  <p className="flex-1 text-lg font-bold">{L.opening.roman}</p>
                  <span className="text-xl font-bold tabular-nums">{formatPKR(opening)}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return <SplitPane left={left} right={<>{right}{toast}</>} />;
}
