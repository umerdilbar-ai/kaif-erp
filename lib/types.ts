// Row types for every table in supabase/migrations/0001_init.sql.
// BALANCE RULE: Party.balance > 0 = party owes the shop; < 0 = shop owes the party.

export type UUID = string;

export interface Category { id: UUID; created_at: string; name: string }
export interface Location { id: UUID; created_at: string; name: string }

export interface Item {
  id: UUID;
  created_at: string;
  name: string;
  category_id: UUID | null;
  location_id: UUID | null;
  photo_url: string | null;
  voice_url: string | null;
  cost_price: number;
  wholesale_price: number;
  retail_price: number;
  min_price: number;
  current_stock: number;
  min_stock_alert: number;
  is_active: boolean;
}

export type PartyType = "CUSTOMER" | "SUPPLIER";
export interface Party {
  id: UUID;
  created_at: string;
  name: string;
  phone: string | null;
  type: PartyType;
  credit_limit: number | null;
  balance: number;
}

export type CounterKey = "SALE" | "PURCHASE" | "QUOTATION" | "VOUCHER";
export interface Counter { key: CounterKey; value: number }

export type InvoiceType = "SALE" | "PURCHASE" | "QUOTATION";
export type InvoiceStatus = "FINAL" | "CONVERTED";
export interface Invoice {
  id: UUID;
  created_at: string;
  invoice_no: number;
  type: InvoiceType;
  status: InvoiceStatus;
  party_id: UUID | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance_due: number;
  notes: string | null;
  converted_to: UUID | null;
}

export interface InvoiceItem {
  id: UUID;
  created_at: string;
  invoice_id: UUID;
  item_id: UUID | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export type StockTxType =
  | "SALE" | "PURCHASE" | "DAMAGE" | "RETURN_IN" | "RETURN_OUT" | "ADJUSTMENT" | "TRANSFER";
export interface StockTransaction {
  id: UUID;
  created_at: string;
  item_id: UUID;
  quantity: number; // +in, -out
  type: StockTxType;
  ref_invoice_id: UUID | null;
  from_location_id: UUID | null;
  to_location_id: UUID | null;
  notes: string | null;
}

export type VoucherType = "RECEIPT" | "PAYMENT" | "EXPENSE";
export interface Voucher {
  id: UUID;
  created_at: string;
  voucher_no: number;
  type: VoucherType;
  party_id: UUID | null;
  expense_category: string | null;
  amount: number;
  description: string | null;
}

export interface CashDay { id: UUID; created_at: string; day: string; opening_cash: number }

// RPC argument shapes
export interface InvoiceLineInput { item_id: UUID; quantity: number; unit_price: number }
export interface CreateInvoiceArgs {
  p_type: InvoiceType;
  p_party_id: UUID | null;
  p_customer_name: string | null;
  p_discount: number;
  p_paid: number;
  p_items: InvoiceLineInput[];
  p_notes: string | null;
}
export interface ConvertQuotationArgs { p_quotation_id: UUID; p_paid: number }
export interface CreateVoucherArgs {
  p_type: VoucherType;
  p_party_id: UUID | null;
  p_expense_category: string | null;
  p_amount: number;
  p_description: string | null;
}
export interface AdjustStockArgs {
  p_item_id: UUID;
  p_quantity: number; // signed; ignored for TRANSFER
  p_type: Exclude<StockTxType, "SALE" | "PURCHASE">;
  p_notes: string | null;
  p_to_location_id: UUID | null;
}
