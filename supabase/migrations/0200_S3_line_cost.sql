-- S3: remember the item's cost price on every invoice line, so profit (Munafa) stays right
-- after cost prices change. The dashboard falls back to items.cost_price if this is not run.

alter table invoice_items add column if not exists cost_price numeric;

create or replace function s3_set_line_cost() returns trigger
language plpgsql as $$
begin
  if new.cost_price is null and new.item_id is not null then
    select cost_price into new.cost_price from items where id = new.item_id;
  end if;
  return new;
end $$;

drop trigger if exists s3_line_cost on invoice_items;
create trigger s3_line_cost before insert on invoice_items
  for each row execute function s3_set_line_cost();

-- backfill existing lines with today's cost
update invoice_items li set cost_price = i.cost_price
  from items i where li.item_id = i.id and li.cost_price is null;
