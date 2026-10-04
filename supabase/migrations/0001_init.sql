-- Kaif ERP schema. Paste into Supabase SQL editor and run once.
-- BALANCE RULE: parties.balance > 0 = party owes the shop (receivable); < 0 = shop owes the party (payable).

create extension if not exists pgcrypto;

create table categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null
);

create table items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  photo_url text,
  voice_url text,
  cost_price numeric not null default 0,
  wholesale_price numeric not null default 0,
  retail_price numeric not null default 0,
  min_price numeric not null default 0,
  current_stock numeric not null default 0,
  min_stock_alert numeric not null default 5,
  is_active boolean not null default true
);

create table parties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  type text not null check (type in ('CUSTOMER','SUPPLIER')),
  credit_limit numeric,
  balance numeric not null default 0
);

create table counters (
  key text primary key,
  value int not null default 0
);
insert into counters (key, value) values ('SALE',0),('PURCHASE',0),('QUOTATION',0),('VOUCHER',0);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_no int not null,
  type text not null check (type in ('SALE','PURCHASE','QUOTATION')),
  status text not null default 'FINAL' check (status in ('FINAL','CONVERTED')),
  party_id uuid references parties(id) on delete set null,
  customer_name text,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  paid numeric not null default 0,
  balance_due numeric not null default 0,
  notes text,
  converted_to uuid references invoices(id) on delete set null,
  unique (type, invoice_no)
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  item_name text not null,
  quantity numeric not null,
  unit_price numeric not null,
  line_total numeric not null
);

create table stock_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item_id uuid not null references items(id) on delete cascade,
  quantity numeric not null, -- +in, -out
  type text not null check (type in ('SALE','PURCHASE','DAMAGE','RETURN_IN','RETURN_OUT','ADJUSTMENT','TRANSFER')),
  ref_invoice_id uuid references invoices(id) on delete set null,
  from_location_id uuid references locations(id) on delete set null,
  to_location_id uuid references locations(id) on delete set null,
  notes text
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  voucher_no int not null unique,
  type text not null check (type in ('RECEIPT','PAYMENT','EXPENSE')),
  party_id uuid references parties(id) on delete set null,
  expense_category text,
  amount numeric not null check (amount > 0),
  description text
);

create table cash_days (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day date not null unique,
  opening_cash numeric not null default 0
);

create index on items (category_id);
create index on invoices (type, created_at);
create index on invoices (party_id);
create index on invoice_items (invoice_id);
create index on stock_transactions (item_id, created_at);
create index on vouchers (created_at);
create index on vouchers (party_id);

-- RLS: signed-in users can do everything
do $$
declare t text;
begin
  foreach t in array array['categories','locations','items','parties','counters','invoices',
                           'invoice_items','stock_transactions','vouchers','cash_days'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- helpers ----------
create or replace function next_number(p_key text) returns int
language sql security invoker as $$
  update counters set value = value + 1 where key = p_key returning value;
$$;

-- ---------- create_invoice ----------
create or replace function create_invoice(
  p_type text,
  p_party_id uuid,
  p_customer_name text,
  p_discount numeric,
  p_paid numeric,
  p_items jsonb,          -- [{item_id, quantity, unit_price}]
  p_notes text
) returns invoices
language plpgsql security invoker as $$
declare
  v_inv invoices;
  v_line jsonb;
  v_item items;
  v_qty numeric;
  v_price numeric;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount, 0);
  v_paid numeric := coalesce(p_paid, 0);
  v_total numeric;
begin
  if p_type not in ('SALE','PURCHASE','QUOTATION') then
    raise exception 'Invalid invoice type %', p_type;
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Invoice needs at least one item';
  end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (v_line->>'quantity')::numeric * (v_line->>'unit_price')::numeric;
  end loop;
  v_total := v_subtotal - v_discount;
  if p_type = 'QUOTATION' then v_paid := 0; end if;

  insert into invoices (invoice_no, type, party_id, customer_name, subtotal, discount, total, paid, balance_due, notes)
  values (next_number(p_type), p_type, p_party_id, p_customer_name, v_subtotal, v_discount, v_total, v_paid,
          case when p_type = 'QUOTATION' then 0 else v_total - v_paid end, p_notes)
  returning * into v_inv;

  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_line->>'quantity')::numeric;
    v_price := (v_line->>'unit_price')::numeric;
    select * into v_item from items where id = (v_line->>'item_id')::uuid;
    if not found then raise exception 'Item % not found', v_line->>'item_id'; end if;

    insert into invoice_items (invoice_id, item_id, item_name, quantity, unit_price, line_total)
    values (v_inv.id, v_item.id, v_item.name, v_qty, v_price, v_qty * v_price);

    if p_type = 'SALE' then
      update items set current_stock = current_stock - v_qty where id = v_item.id;
      insert into stock_transactions (item_id, quantity, type, ref_invoice_id)
      values (v_item.id, -v_qty, 'SALE', v_inv.id);
    elsif p_type = 'PURCHASE' then
      update items set current_stock = current_stock + v_qty, cost_price = v_price where id = v_item.id;
      insert into stock_transactions (item_id, quantity, type, ref_invoice_id)
      values (v_item.id, v_qty, 'PURCHASE', v_inv.id);
    end if;
  end loop;

  if p_party_id is not null then
    if p_type = 'SALE' then
      update parties set balance = balance + (v_total - v_paid) where id = p_party_id;
    elsif p_type = 'PURCHASE' then
      update parties set balance = balance - (v_total - v_paid) where id = p_party_id;
    end if;
  end if;

  return v_inv;
end $$;

-- ---------- convert_quotation ----------
create or replace function convert_quotation(p_quotation_id uuid, p_paid numeric)
returns invoices
language plpgsql security invoker as $$
declare
  v_q invoices;
  v_new invoices;
  v_items jsonb;
begin
  select * into v_q from invoices where id = p_quotation_id for update;
  if not found or v_q.type <> 'QUOTATION' then raise exception 'Quotation not found'; end if;
  if v_q.status = 'CONVERTED' then raise exception 'Quotation already converted'; end if;

  select jsonb_agg(jsonb_build_object('item_id', item_id, 'quantity', quantity, 'unit_price', unit_price))
    into v_items from invoice_items where invoice_id = v_q.id;

  v_new := create_invoice('SALE', v_q.party_id, v_q.customer_name, v_q.discount, p_paid, v_items, v_q.notes);
  update invoices set status = 'CONVERTED', converted_to = v_new.id where id = v_q.id;
  return v_new;
end $$;

-- ---------- create_voucher ----------
create or replace function create_voucher(
  p_type text,
  p_party_id uuid,
  p_expense_category text,
  p_amount numeric,
  p_description text
) returns vouchers
language plpgsql security invoker as $$
declare v vouchers;
begin
  if p_type not in ('RECEIPT','PAYMENT','EXPENSE') then raise exception 'Invalid voucher type %', p_type; end if;
  if p_type in ('RECEIPT','PAYMENT') and p_party_id is null then raise exception 'Party required'; end if;

  insert into vouchers (voucher_no, type, party_id, expense_category, amount, description)
  values (next_number('VOUCHER'), p_type,
          case when p_type = 'EXPENSE' then null else p_party_id end,
          case when p_type = 'EXPENSE' then p_expense_category else null end,
          p_amount, p_description)
  returning * into v;

  if p_type = 'RECEIPT' then
    update parties set balance = balance - p_amount where id = p_party_id;
  elsif p_type = 'PAYMENT' then
    update parties set balance = balance + p_amount where id = p_party_id;
  end if;
  return v;
end $$;

-- ---------- adjust_stock ----------
-- p_quantity is signed (+in / -out). For TRANSFER it is ignored (logged as 0) and the item moves to p_to_location_id.
create or replace function adjust_stock(
  p_item_id uuid,
  p_quantity numeric,
  p_type text,
  p_notes text,
  p_to_location_id uuid
) returns stock_transactions
language plpgsql security invoker as $$
declare
  v_item items;
  v_tx stock_transactions;
begin
  if p_type not in ('DAMAGE','RETURN_IN','RETURN_OUT','ADJUSTMENT','TRANSFER') then
    raise exception 'Invalid adjust type %', p_type;
  end if;
  select * into v_item from items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;

  if p_type = 'TRANSFER' then
    if p_to_location_id is null then raise exception 'Target location required'; end if;
    update items set location_id = p_to_location_id where id = p_item_id;
    insert into stock_transactions (item_id, quantity, type, from_location_id, to_location_id, notes)
    values (p_item_id, 0, 'TRANSFER', v_item.location_id, p_to_location_id, p_notes)
    returning * into v_tx;
  else
    update items set current_stock = current_stock + p_quantity where id = p_item_id;
    insert into stock_transactions (item_id, quantity, type, notes)
    values (p_item_id, p_quantity, p_type, p_notes)
    returning * into v_tx;
  end if;
  return v_tx;
end $$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values
  ('item-photos', 'item-photos', true),
  ('item-voice', 'item-voice', true)
on conflict (id) do nothing;

create policy "auth_insert_item_media" on storage.objects for insert to authenticated
  with check (bucket_id in ('item-photos','item-voice'));
create policy "auth_update_item_media" on storage.objects for update to authenticated
  using (bucket_id in ('item-photos','item-voice'))
  with check (bucket_id in ('item-photos','item-voice'));
