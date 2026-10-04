"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { L } from "@/lib/labels";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const input =
    "w-full h-16 rounded-xl border-2 border-brand/30 bg-white px-4 text-xl focus:border-brand focus:outline-none";

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-24 w-24" />
          <h1 className="text-5xl font-extrabold tracking-wide text-brand">KAIF</h1>
          <p className="text-base text-navy/70">Pipes and Small Inventory Solutions</p>
        </div>
        <input className={input} type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="rounded-lg bg-red-50 p-3 text-money-out">{error}</p>}
        <button type="submit" disabled={loading}
          className="flex w-full min-h-20 items-center justify-center gap-3 rounded-2xl bg-brand text-2xl font-bold text-white active:scale-[0.98] disabled:opacity-60">
          {loading ? <Loader2 className="size-8 animate-spin" /> : <LogIn className="size-8" />}
          <span>{L.login.roman}</span>
          <span className="font-urdu text-xl">{L.login.ur}</span>
        </button>
      </form>
    </main>
  );
}
