"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV } from "./nav";
import { L } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function IconRail() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const tile =
    "tile flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl p-2 text-center text-white shadow-sm transition active:scale-95 w-24 min-h-24";

  return (
    <nav className="flex shrink-0 gap-2 overflow-x-auto bg-white/70 p-2 min-[900px]:h-dvh min-[900px]:w-28 min-[900px]:flex-col min-[900px]:overflow-y-auto min-[900px]:overflow-x-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Kaif" className="hidden size-14 self-center min-[900px]:block" />
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} title={label.en}
            className={cn(tile, color, active ? "ring-4 ring-navy ring-offset-2" : "opacity-90")}>
            <Icon className="size-8" />
            <span className="text-sm font-bold leading-tight">{label.roman}</span>
            <span className="font-urdu text-xs leading-loose">{label.ur}</span>
          </Link>
        );
      })}
      <button onClick={logout} title={L.logout.en} className={cn(tile, "bg-neutral-500")}>
        <LogOut className="size-7" />
        <span className="text-sm font-bold">{L.logout.roman}</span>
      </button>
    </nav>
  );
}
