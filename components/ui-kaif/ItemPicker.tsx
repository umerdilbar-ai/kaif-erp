"use client";

import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Item } from "@/lib/types";
import { L } from "@/lib/labels";
import { formatPKR, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SearchBox } from "./SearchBox";
import { EmptyState } from "./EmptyState";

/**
 * Category chips + search + big item tiles with stock badge. Loads active items itself
 * unless `items`/`categories` are passed. `priceField` picks which price shows on the tile.
 */
export function ItemPicker({
  onPick,
  items: givenItems,
  categories: givenCats,
  priceField = "retail_price",
}: {
  onPick: (item: Item) => void;
  items?: Item[];
  categories?: Category[];
  priceField?: "retail_price" | "wholesale_price" | "cost_price";
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const sb = createClient();
    if (!givenItems)
      sb.from("items").select("*").eq("is_active", true).order("name")
        .then(({ data }) => setItems((data as Item[]) ?? []));
    if (!givenCats)
      sb.from("categories").select("*").order("name")
        .then(({ data }) => setCats((data as Category[]) ?? []));
  }, [givenItems, givenCats]);

  const allItems = givenItems ?? items;
  const allCats = givenCats ?? cats;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allItems.filter(
      (i) => (!cat || i.category_id === cat) && (!s || i.name.toLowerCase().includes(s))
    );
  }, [allItems, cat, q]);

  const chip = "min-h-12 shrink-0 rounded-full px-5 text-lg font-semibold";

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCat(null)}
          className={cn(chip, !cat ? "bg-brand text-white" : "bg-cream text-navy")}>
          Sab / All
        </button>
        {allCats.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            className={cn(chip, cat === c.id ? "bg-brand text-white" : "bg-cream text-navy")}>
            {c.name}
          </button>
        ))}
      </div>
      {list.length === 0 && <EmptyState label={L.nothingHere} />}
      <div className="grid grid-cols-2 gap-3 min-[1300px]:grid-cols-3">
        {list.map((i) => {
          const low = Number(i.current_stock) <= Number(i.min_stock_alert);
          return (
            <button key={i.id} type="button" onClick={() => onPick(i)}
              className="relative flex min-h-36 flex-col items-center justify-between gap-1 rounded-2xl bg-cream/70 p-3 text-center shadow-sm active:scale-95">
              <span className={cn(
                "absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-white",
                Number(i.current_stock) <= 0 ? "bg-money-out" : low ? "bg-pending" : "bg-money-in"
              )}>
                {formatQty(i.current_stock)}
              </span>
              {i.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.photo_url} alt="" className="size-16 rounded-lg object-cover" />
              ) : (
                <Package className="size-14 text-bronze" />
              )}
              <span className="line-clamp-2 text-lg font-bold leading-tight">{i.name}</span>
              <span className="text-base text-navy/70">{formatPKR(i[priceField])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
