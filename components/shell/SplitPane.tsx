import { cn } from "@/lib/utils";

/** Every page renders this. Left ~40% list/picker, right ~60% workspace. Stacks under 900px. */
export function SplitPane({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 p-3 min-[900px]:h-dvh min-[900px]:flex-row", className)}>
      <section className="min-h-0 rounded-2xl bg-white p-4 shadow-sm min-[900px]:w-2/5 min-[900px]:overflow-y-auto">
        {left}
      </section>
      <section className="min-h-0 rounded-2xl bg-white p-4 shadow-sm min-[900px]:w-3/5 min-[900px]:overflow-y-auto">
        {right}
      </section>
    </div>
  );
}
