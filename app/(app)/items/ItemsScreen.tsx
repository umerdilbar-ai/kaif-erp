"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ImageUp, MapPin, Package, Plus, Save } from "lucide-react";
import type { Category, Item, Location } from "@/lib/types";
import { formatPKR, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, PageTitle, SearchBox, useDing } from "@/components/ui-kaif";
import { ChipSelect, L, NumField, PlayButton, Tri, VoiceRecorder, sb, useToast } from "@/components/s2";

type Form = {
  name: string;
  category_id: string | null;
  location_id: string | null;
  cost_price: string;
  wholesale_price: string;
  retail_price: string;
  min_price: string;
  opening: string;
  min_stock_alert: string;
};

const EMPTY: Form = {
  name: "", category_id: null, location_id: null, cost_price: "", wholesale_price: "",
  retail_price: "", min_price: "", opening: "", min_stock_alert: "5",
};

const str = (n: number | null | undefined) => (n ? String(n) : "");

export function ItemsScreen() {
  const ding = useDing();
  const { show, toast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [i, c, l] = await Promise.all([
      sb().from("items").select("*").eq("is_active", true).order("name"),
      sb().from("categories").select("*").order("name"),
      sb().from("locations").select("*").order("name"),
    ]);
    setItems((i.data as Item[]) ?? []);
    setCats((c.data as Category[]) ?? []);
    setLocs((l.data as Location[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const locName = useMemo(() => Object.fromEntries(locs.map((l) => [l.id, l.name])), [locs]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (!cat || i.category_id === cat) && (!s || i.name.toLowerCase().includes(s)));
  }, [items, cat, q]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY);
    setPhoto(null);
    setVoice(null);
  }

  function startEdit(i: Item) {
    setEditing(i);
    setForm({
      name: i.name, category_id: i.category_id, location_id: i.location_id,
      cost_price: str(i.cost_price), wholesale_price: str(i.wholesale_price),
      retail_price: str(i.retail_price), min_price: str(i.min_price), opening: "",
      min_stock_alert: String(i.min_stock_alert ?? 0),
    });
    setPhoto(null);
    setVoice(null);
  }

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function createNamed(table: "categories" | "locations", name: string) {
    const { data, error } = await sb().from(table).insert({ name }).select().single<Category>();
    if (error) { show(error.message, "err"); return null; }
    if (table === "categories") setCats((c) => [...c, data].sort((a, b) => a.name.localeCompare(b.name)));
    else setLocs((c) => [...c, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }

  async function upload(bucket: "item-photos" | "item-voice", id: string, file: Blob, ext: string) {
    const path = `${id}-${Date.now()}.${ext}`;
    const { error } = await sb().storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw error;
    return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    if (!form.name.trim()) return show("Naam likho / Enter a name", "err");
    setBusy(true);
    try {
      const row = {
        name: form.name.trim(),
        category_id: form.category_id,
        location_id: form.location_id,
        cost_price: Number(form.cost_price || 0),
        wholesale_price: Number(form.wholesale_price || 0),
        retail_price: Number(form.retail_price || 0),
        min_price: Number(form.min_price || 0),
        min_stock_alert: Number(form.min_stock_alert || 0),
      };
      let item: Item;
      if (editing) {
        const { data, error } = await sb().from("items").update(row).eq("id", editing.id).select().single<Item>();
        if (error) throw error;
        item = data;
      } else {
        const { data, error } = await sb().from("items").insert(row).select().single<Item>();
        if (error) throw error;
        item = data;
        const opening = Number(form.opening || 0);
        if (opening) {
          const { error: e2 } = await sb().rpc("adjust_stock", {
            p_item_id: item.id, p_quantity: opening, p_type: "ADJUSTMENT",
            p_notes: "Opening stock", p_to_location_id: null,
          });
          if (e2) throw e2;
        }
      }
      const media: Partial<Item> = {};
      if (photo) media.photo_url = await upload("item-photos", item.id, photo, photo.name.split(".").pop() || "jpg");
      if (voice) media.voice_url = await upload("item-voice", item.id, voice, voice.type.includes("mp4") ? "m4a" : "webm");
      if (Object.keys(media).length) {
        const { error } = await sb().from("items").update(media).eq("id", item.id);
        if (error) throw error;
      }
      ding();
      show(`${L.saved.roman} ✓`);
      await load();
      startNew();
    } catch (e) {
      show((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : editing?.photo_url ?? null), [photo, editing]);
  const chip = "min-h-12 shrink-0 rounded-full px-5 text-lg font-semibold";

  const left = (
    <div className="space-y-3">
      <PageTitle label={L.items} right={
        <BigButton variant="in" icon={Plus} onClick={startNew} className="px-4">
          <span className="hidden min-[400px]:inline">Naya</span>
        </BigButton>
      } />
      <SearchBox value={q} onChange={setQ} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCat(null)}
          className={cn(chip, !cat ? "bg-brand text-white" : "bg-cream text-navy")}>Sab / All</button>
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            className={cn(chip, cat === c.id ? "bg-brand text-white" : "bg-cream text-navy")}>{c.name}</button>
        ))}
      </div>
      {list.length === 0 && <EmptyState label={L.nothingHere} icon={Package} />}
      <ul className="space-y-2">
        {list.map((i) => {
          const stock = Number(i.current_stock);
          const low = stock < Number(i.min_stock_alert);
          return (
            <li key={i.id}>
              <button type="button" onClick={() => startEdit(i)}
                className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left active:scale-[0.99]",
                  editing?.id === i.id ? "border-brand bg-brand/5" : "border-transparent bg-cream/60")}>
                {i.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.photo_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <Package className="size-12 shrink-0 text-bronze" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-bold">{i.name}</span>
                  <span className="flex flex-wrap items-center gap-2 text-base text-navy/70">
                    {i.location_id && locName[i.location_id] && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-sm font-semibold">
                        <MapPin className="size-4" />{locName[i.location_id]}
                      </span>
                    )}
                    {formatPKR(i.retail_price)}
                  </span>
                </span>
                {i.voice_url && <PlayButton url={i.voice_url} />}
                <span className={cn("min-w-14 rounded-full px-3 py-1 text-center text-lg font-bold text-white",
                  low ? "bg-money-out" : "bg-money-in")}>
                  {formatQty(stock)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const right = (
    <div className="space-y-5">
      <PageTitle label={editing ? { ...L.edit, roman: `${L.edit.roman}: ${editing.name}` } : L.newItem} />

      <label className="block space-y-1">
        <Tri label={L.name} small />
        <input value={form.name} onChange={(e) => set("name")(e.target.value)}
          className="h-16 w-full rounded-2xl border-2 border-brand/30 bg-white px-4 text-2xl font-bold focus:border-brand focus:outline-none" />
      </label>

      <div className="space-y-2">
        <Tri label={L.photo} small />
        <div className="flex flex-wrap items-center gap-3">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className="size-24 rounded-2xl object-cover" />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-2xl bg-cream"><Package className="size-12 text-bronze" /></div>
          )}
          <label className="flex min-h-16 cursor-pointer items-center gap-2 rounded-2xl bg-brand px-5 text-xl font-bold text-white">
            <Camera className="size-7" /> {L.camera.roman}
            <input type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          <label className="flex min-h-16 cursor-pointer items-center gap-2 rounded-2xl bg-cream px-5 text-xl font-bold text-navy">
            <ImageUp className="size-7" /> {L.gallery.roman}
            <input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Tri label={L.voice} small />
        <VoiceRecorder blob={voice} onBlob={setVoice} existingUrl={editing?.voice_url} />
      </div>

      <div className="space-y-2">
        <Tri label={L.category} small />
        <ChipSelect options={cats} value={form.category_id} onChange={set("category_id")}
          onCreate={(n) => createNamed("categories", n)} />
      </div>
      <div className="space-y-2">
        <Tri label={L.location} small />
        <ChipSelect options={locs} value={form.location_id} onChange={set("location_id")}
          onCreate={(n) => createNamed("locations", n)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumField label={L.costPrice} prefix="Rs" value={form.cost_price} onChange={set("cost_price")} />
        <NumField label={L.wholesale} prefix="Rs" value={form.wholesale_price} onChange={set("wholesale_price")} />
        <NumField label={L.retail} prefix="Rs" value={form.retail_price} onChange={set("retail_price")} />
        <NumField label={L.minPrice} prefix="Rs" value={form.min_price} onChange={set("min_price")} />
        {editing ? (
          <div className="space-y-1">
            <Tri label={L.currentStock} small />
            <div className={cn("flex h-16 items-center rounded-2xl px-4 text-2xl font-bold text-white",
              Number(editing.current_stock) < Number(editing.min_stock_alert) ? "bg-money-out" : "bg-money-in")}>
              {formatQty(editing.current_stock)}
            </div>
          </div>
        ) : (
          <NumField label={L.openingStock} value={form.opening} onChange={set("opening")} />
        )}
        <NumField label={L.lowAlert} value={form.min_stock_alert} onChange={set("min_stock_alert")} />
      </div>

      <BigButton variant="in" icon={Save} label={L.save} disabled={busy} onClick={save} className="w-full" />
      {toast}
    </div>
  );

  return <SplitPane left={left} right={right} />;
}
