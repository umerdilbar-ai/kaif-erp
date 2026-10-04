import { IconRail } from "@/components/shell/IconRail";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col min-[900px]:h-dvh min-[900px]:flex-row min-[900px]:overflow-hidden">
      <IconRail />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
