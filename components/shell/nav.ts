import {
  Home, ReceiptText, FileText, Truck, Package, Tags, Boxes, Users, Wallet, BookOpen,
  type LucideIcon,
} from "lucide-react";
import { L, type Label } from "@/lib/labels";

export interface NavItem { href: string; label: Label; icon: LucideIcon; color: string }

export const NAV: NavItem[] = [
  { href: "/", label: L.dashboard, icon: Home, color: "bg-brand" },
  { href: "/sale", label: L.sale, icon: ReceiptText, color: "bg-green-700" },
  { href: "/quotation", label: L.quotation, icon: FileText, color: "bg-sky-700" },
  { href: "/purchase", label: L.purchase, icon: Truck, color: "bg-red-700" },
  { href: "/items", label: L.items, icon: Package, color: "bg-bronze" },
  { href: "/rate-list", label: L.rateList, icon: Tags, color: "bg-violet-700" },
  { href: "/stock", label: L.stock, icon: Boxes, color: "bg-teal-700" },
  { href: "/parties", label: L.parties, icon: Users, color: "bg-amber-600" },
  { href: "/vouchers", label: L.vouchers, icon: Wallet, color: "bg-emerald-700" },
  { href: "/roznamcha", label: L.roznamcha, icon: BookOpen, color: "bg-navy" },
];
