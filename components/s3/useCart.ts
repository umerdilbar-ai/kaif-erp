"use client";

import { useCallback, useMemo, useState } from "react";
import type { InvoiceLineInput, Item, Party } from "@/lib/types";

export type PriceMode = "retail" | "wholesale";
export interface CartLine { item: Item; qty: string; price: string }

export const num = (s: string | number | null | undefined) => Number(s) || 0;

function priceFor(item: Item, mode: PriceMode) {
  const p = mode === "wholesale" ? num(item.wholesale_price) : 0;
  return String(p || num(item.retail_price));
}

/** Cart state for sale / quotation. `paid === null` means "full cash" (follows the total). */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [mode, setModeState] = useState<PriceMode>("retail");
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState<string | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [walkIn, setWalkIn] = useState("");

  const add = useCallback(
    (item: Item) =>
      setLines((ls) => {
        const i = ls.findIndex((l) => l.item.id === item.id);
        if (i < 0) return [...ls, { item, qty: "1", price: priceFor(item, mode) }];
        return ls.map((l, j) => (j === i ? { ...l, qty: String(num(l.qty) + 1) } : l));
      }),
    [mode]
  );

  const update = useCallback(
    (idx: number, patch: Partial<CartLine>) =>
      setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l))),
    []
  );
  const remove = useCallback((idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx)), []);

  const setMode = useCallback((m: PriceMode) => {
    setModeState(m);
    setLines((ls) => ls.map((l) => ({ ...l, price: priceFor(l.item, m) })));
  }, []);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + num(l.qty) * num(l.price), 0);
    const disc = Math.min(num(discount), subtotal);
    const total = subtotal - disc;
    const paidN = paid === null ? total : num(paid);
    return { subtotal, discount: disc, total, paid: paidN, baaqi: total - paidN };
  }, [lines, discount, paid]);

  const clear = useCallback(() => {
    setLines([]);
    setDiscount("");
    setPaid(null);
    setParty(null);
    setWalkIn("");
  }, []);

  const rpcItems = (): InvoiceLineInput[] =>
    lines.map((l) => ({ item_id: l.item.id, quantity: num(l.qty), unit_price: num(l.price) }));

  return {
    lines, add, update, remove, mode, setMode, discount, setDiscount, paid, setPaid,
    party, setParty, walkIn, setWalkIn, totals, clear, rpcItems,
  };
}

export type Cart = ReturnType<typeof useCart>;
