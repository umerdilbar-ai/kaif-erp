"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { L } from "@/lib/labels";

export function SearchBox({
  value,
  onChange,
  placeholder = `${L.search.roman} / ${L.search.en}`,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-7 -translate-y-1/2 text-navy/50" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-16 w-full rounded-2xl border-2 border-brand/30 bg-white pl-14 pr-14 text-xl focus:border-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear"
          className="absolute right-2 top-1/2 flex size-12 min-h-0 -translate-y-1/2 items-center justify-center rounded-full text-navy/60"
        >
          <X className="size-6" />
        </button>
      )}
    </div>
  );
}
