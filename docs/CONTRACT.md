# Kaif ERP — Shared Contract

Read this before building. S1 (foundation) owns everything not listed below.
**Do not edit** `lib/`, `components/ui-kaif/`, `components/shell/`, `middleware.ts`, `app/layout.tsx`,
`app/(app)/layout.tsx`, `app/globals.css` or `supabase/migrations/0001_init.sql`.
Need a schema change? Add a new file `supabase/migrations/00NN_<session>_<what>.sql` (S2 uses 0100+, S3 uses 0200+).
Need a new label? Define it locally in your own folder (spread `L` and add yours).

## Folder ownership

| Session | Owns |
|---|---|
| S2 Stock & Khata | `app/(app)/items`, `app/(app)/rate-list`, `app/(app)/stock`, `app/(app)/purchase`, `app/(app)/parties`, `components/s2/` |
| S3 Sales & Cash | `app/(app)/sale`, `app/(app)/quotation`, `app/(app)/invoices`, `app/print`, `app/(app)/vouchers`, `app/(app)/roznamcha`, `app/(app)/page.tsx` (dashboard), `components/s3/` |

Notes: `app/print` is outside the `(app)` group, so it renders without the icon rail (good for printing) but is still behind login.
`app/(app)/invoices` is not in the nav rail; link to it from your own pages.

## BALANCE RULE

`parties.balance > 0` → party owes the shop (receivable, "Lena Hai").
`parties.balance < 0` → shop owes the party (payable, "Dena Hai").
Only the RPCs below change balances and stock. **Never update `parties.balance` or `items.current_stock` directly.**

## Colors

green (`text-money-in`, `bg-money-in`) = money/stock in · red (`money-out`) = money/stock out · amber (`pending`) = pending udhaar.
Brand: `brand` (teal), `bronze`, `navy`, `cream`. Urdu text: add class `font-urdu` (and `dir="rtl"` for blocks).
Breakpoint for stacking: `min-[900px]:`.

## Supabase clients

```ts
import { createClient } from "@/lib/supabase/client"; // client components
import { createClient } from "@/lib/supabase/server"; // server components / actions (await it)
```
Types for every table are in `lib/types.ts`. Money: `formatPKR(n)` from `lib/format.ts`. Labels: `L` from `lib/labels.ts`.

## RPCs

All run in one transaction and throw on bad input (show `error.message`).

### create_invoice → `invoices` row
`create_invoice(p_type, p_party_id, p_customer_name, p_discount, p_paid, p_items jsonb, p_notes)`
- SALE: stock −qty, `stock_transactions` SALE, `party.balance += total − paid`
- PURCHASE: stock +qty, PURCHASE tx, `items.cost_price = unit_price`, `party.balance −= total − paid`
- QUOTATION: no stock/balance change; paid & balance_due forced to 0
- `p_party_id` may be null (walk-in; use `p_customer_name`).
```ts
const { data: inv, error } = await supabase.rpc("create_invoice", {
  p_type: "SALE", p_party_id: party?.id ?? null, p_customer_name: "Walk-in",
  p_discount: 50, p_paid: 1000,
  p_items: [{ item_id: "…", quantity: 2, unit_price: 520 }],
  p_notes: null,
} satisfies CreateInvoiceArgs).single<Invoice>();
```

### convert_quotation → new SALE `invoices` row
`convert_quotation(p_quotation_id, p_paid)` — copies lines/discount/party, marks quotation `CONVERTED` with `converted_to`.
```ts
const { data: sale } = await supabase.rpc("convert_quotation", { p_quotation_id: q.id, p_paid: 0 }).single<Invoice>();
```

### create_voucher → `vouchers` row
`create_voucher(p_type, p_party_id, p_expense_category, p_amount, p_description)`
- RECEIPT (Vasooli, cash in): `party.balance −= amount` (party required)
- PAYMENT (Adaigi, cash out): `party.balance += amount` (party required)
- EXPENSE (Kharcha): no party; `p_expense_category` e.g. "Bijli", "Chai", "Kiraya"
```ts
await supabase.rpc("create_voucher", {
  p_type: "RECEIPT", p_party_id: party.id, p_expense_category: null, p_amount: 5000, p_description: null,
} satisfies CreateVoucherArgs);
```

### adjust_stock → `stock_transactions` row
`adjust_stock(p_item_id, p_quantity, p_type, p_notes, p_to_location_id)`
- `p_type`: DAMAGE | RETURN_IN | RETURN_OUT | ADJUSTMENT → `current_stock += p_quantity` (**signed**: pass −3 for damage/return out)
- TRANSFER → moves item to `p_to_location_id`, logs from/to with quantity 0 (`p_quantity` ignored)
```ts
await supabase.rpc("adjust_stock", { p_item_id: id, p_quantity: -3, p_type: "DAMAGE", p_notes: "toota", p_to_location_id: null } satisfies AdjustStockArgs);
await supabase.rpc("adjust_stock", { p_item_id: id, p_quantity: 0, p_type: "TRANSFER", p_notes: null, p_to_location_id: loc.id });
```

Plain CRUD (categories, locations, items, parties, cash_days) goes through `supabase.from(...)` directly.
Numbering: `counters` table, keys SALE / PURCHASE / QUOTATION / VOUCHER (handled inside RPCs).

## Storage

Public buckets `item-photos`, `item-voice` (authenticated insert/update).
```ts
const path = `${item.id}-${Date.now()}.jpg`;
await supabase.storage.from("item-photos").upload(path, file, { upsert: true });
const url = supabase.storage.from("item-photos").getPublicUrl(path).data.publicUrl; // save to items.photo_url
```

## Layout

Every page returns `<SplitPane left={…} right={…} />` (`@/components/shell/SplitPane`): left ~40% list/picker, right ~60% workspace, each scrolls on its own; stacks under 900px. The icon rail is in the layout already.

## Shared components — `@/components/ui-kaif` (import from the barrel)

| Component | Props |
|---|---|
| `BigButton` | `variant?: "in" \| "out" \| "pending" \| "neutral"`, `label?: Label`, `icon?: LucideIcon`, plus all `<button>` props. Min height 56px. |
| `MoneyText` | `amount: number`, `intent?: "auto" \| "in" \| "out" \| "pending" \| "neutral"` (auto: +green/−red), `abs?: boolean`, `className?` |
| `NumPad` | `value: string`, `onChange(next: string)`, `allowDecimal?: boolean = true`, `className?` |
| `SearchBox` | `value`, `onChange(v)`, `placeholder?`, `autoFocus?`, `className?` |
| `PartyPicker` | `onPick(party: Party)`, `type?: "CUSTOMER" \| "SUPPLIER"`, `selectedId?`, `parties?: Party[]` (self-loads if omitted). Balance in amber with Lena/Dena. |
| `ItemPicker` | `onPick(item: Item)`, `items?: Item[]`, `categories?: Category[]` (self-loads active items if omitted), `priceField?: "retail_price" \| "wholesale_price" \| "cost_price"` |
| `EmptyState` | `label: Label`, `icon?: LucideIcon`, `children?` |
| `PageTitle` | `label: Label`, `right?: ReactNode` |
| `useDing()` | returns `ding()` — play after a successful save |

`Label = { roman, en, ur }`. Show Roman Urdu biggest, Urdu script second, English small.
