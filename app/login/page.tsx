"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setError("E-posta adresi veya şifre hatalı.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("E-posta adresiniz henüz doğrulanmamış.");
      } else {
        setError("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
      setLoading(false);
      return;
    }

    router.push("/genel-bakis");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-white via-blue-100 to-blue-300 font-sans">
      <section className="bg-white/95 border border-blue-100 rounded-2xl shadow-2xl flex flex-col items-center px-14 py-16 max-w-md w-full">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/aesthecore-logo.PNG" alt="AestheCore" className="w-36 h-36 object-contain" />
          <h1 style={{ fontFamily: "var(--font-raleway)" }} className="text-4xl font-bold tracking-tight leading-none">
            <span className="text-[#7096BE]">Aesthe</span><span className="text-[#1C3557]">Core</span>
          </h1>
          <p style={{ fontFamily: "var(--font-raleway)" }} className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em]">
            Innovation &amp; Harmony
          </p>
        </div>
        <p className="text-sm text-blue-600 mb-8">Klinik yönetim paneline giriş yapın</p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@klinik.com"
              className="px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 text-sm bg-slate-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 text-sm bg-slate-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-6 py-3 rounded-full text-base font-bold shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
