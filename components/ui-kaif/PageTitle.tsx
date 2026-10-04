import type { Label } from "@/lib/labels";

/** Trilingual heading: big Roman Urdu, Urdu script, small English. */
export function PageTitle({ label, right }: { label: Label; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold text-brand">{label.roman}</h1>
        <p className="font-urdu text-2xl text-navy" dir="rtl">{label.ur}</p>
        <p className="text-base text-navy/60">{label.en}</p>
      </div>
      {right}
    </div>
  );
}
