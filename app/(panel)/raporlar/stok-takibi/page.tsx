"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  X,
} from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type Kategori = "Toksin" | "Dolgu" | "İp" | "Medikal" | "Sarf";

interface Stok {
  id: string;
  urun_adi: string;
  kategori: Kategori;
  adet: number;
  kritik_seviye: number;
  birim_fiyat: number;
  son_kullanma_tarihi: string | null;
  notlar: string | null;
  created_at: string;
}

interface StokForm {
  urun_adi: string;
  kategori: Kategori;
  adet: number;
  kritik_seviye: number;
  birim_fiyat: number;
  son_kullanma_tarihi: string;
  notlar: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KATEGORI_OPTIONS: Kategori[] = ["Toksin", "Dolgu", "İp", "Medikal", "Sarf"];

const KATEGORI_STYLE: Record<Kategori, { bg: string; text: string; bar: string }> = {
  Toksin:  { bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500" },
  Dolgu:   { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-500"   },
  İp:      { bg: "bg-indigo-50", text: "text-indigo-700", bar: "bg-indigo-500" },
  Medikal: { bg: "bg-sky-50",    text: "text-sky-700",    bar: "bg-sky-500"    },
  Sarf:    { bg: "bg-cyan-50",   text: "text-cyan-700",   bar: "bg-cyan-500"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currency(val: number) {
  return val.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ExpiryBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  const label = formatDate(date);
  if (days < 0)
    return <span className="text-xs font-bold text-white bg-rose-600 px-2 py-0.5 rounded-full">Süresi doldu</span>;
  if (days <= 30)
    return <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{label} · {days}g</span>;
  if (days <= 60)
    return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{label} · {days}g</span>;
  return <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{label}</span>;
}

function StockBar({ adet, kritikSeviye }: { adet: number; kritikSeviye: number }) {
  const target = Math.max(kritikSeviye * 4, adet, 1);
  const pct = Math.min((adet / target) * 100, 100);
  const isKritik = adet <= kritikSeviye;
  const isDusuk = !isKritik && pct < 40;
  const barColor = isKritik ? "bg-rose-500" : isDusuk ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx("text-sm font-bold tabular-nums shrink-0 w-7 text-right", isKritik ? "text-rose-700" : "text-slate-800")}>
        {adet}
      </span>
      {isKritik && <AlertTriangle size={13} className="text-rose-500 shrink-0" />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StokTakibiPage() {
  const [stokListesi, setStokListesi] = useState<Stok[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | "">("");
  const [modalOpen, setModalOpen] = useState<null | "yeni" | { edit: Stok }>(null);
  const [form, setForm] = useState<StokForm>({
    urun_adi: "", kategori: "Toksin", adet: 0, kritik_seviye: 5,
    birim_fiyat: 0, son_kullanma_tarihi: "", notlar: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchStoklar() {
    setLoading(true);
    const { data } = await supabase.from("stoklar").select("*").order("urun_adi", { ascending: true });
    if (Array.isArray(data)) setStokListesi(data as Stok[]);
    setLoading(false);
  }

  useEffect(() => { fetchStoklar(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const kritikStoklar = useMemo(
    () => stokListesi.filter((s) => s.adet <= s.kritik_seviye),
    [stokListesi]
  );

  const toplamDeger = useMemo(
    () => stokListesi.reduce((sum, s) => sum + s.adet * s.birim_fiyat, 0),
    [stokListesi]
  );

  const yakindaSonacak = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 60);
    return stokListesi.filter(
      (s) => s.son_kullanma_tarihi && new Date(s.son_kullanma_tarihi) <= limit
    );
  }, [stokListesi]);

  // Category stats (sorted by value desc)
  const kategoriStats = useMemo(() => {
    const stats: Record<string, { urunSayisi: number; adet: number; deger: number; kritik: number }> = {};
    stokListesi.forEach((s) => {
      if (!stats[s.kategori]) stats[s.kategori] = { urunSayisi: 0, adet: 0, deger: 0, kritik: 0 };
      stats[s.kategori].urunSayisi++;
      stats[s.kategori].adet += s.adet;
      stats[s.kategori].deger += s.adet * s.birim_fiyat;
      if (s.adet <= s.kritik_seviye) stats[s.kategori].kritik++;
    });
    return Object.entries(stats).sort((a, b) => b[1].deger - a[1].deger);
  }, [stokListesi]);

  // Filtered table — critical items first, then alphabetical
  const tableData = useMemo(() => {
    let d = [...stokListesi];
    if (kategoriFilter) d = d.filter((s) => s.kategori === kategoriFilter);
    if (q) d = d.filter((s) => s.urun_adi.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")));
    d.sort((a, b) => {
      const aK = a.adet <= a.kritik_seviye;
      const bK = b.adet <= b.kritik_seviye;
      if (aK !== bK) return aK ? -1 : 1;
      return a.urun_adi.localeCompare(b.urun_adi, "tr-TR");
    });
    return d;
  }, [stokListesi, q, kategoriFilter]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function openYeni() {
    setForm({ urun_adi: "", kategori: "Toksin", adet: 0, kritik_seviye: 5, birim_fiyat: 0, son_kullanma_tarihi: "", notlar: "" });
    setModalOpen("yeni");
  }

  function openEdit(s: Stok) {
    setForm({
      urun_adi: s.urun_adi, kategori: s.kategori, adet: s.adet, kritik_seviye: s.kritik_seviye,
      birim_fiyat: s.birim_fiyat, son_kullanma_tarihi: s.son_kullanma_tarihi ?? "", notlar: s.notlar ?? "",
    });
    setModalOpen({ edit: s });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    const payload = {
      ...form,
      son_kullanma_tarihi: form.son_kullanma_tarihi || null,
      notlar: form.notlar || null,
    };
    if (modalOpen === "yeni") {
      await supabase.from("stoklar").insert(payload);
    } else if (modalOpen && "edit" in modalOpen) {
      await supabase.from("stoklar").update(payload).eq("id", modalOpen.edit.id);
    }
    await fetchStoklar();
    setFormLoading(false);
    setModalOpen(null);
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    await supabase.from("stoklar").delete().eq("id", id);
    await fetchStoklar();
    setDeleteLoading(false);
    setDeleteId(null);
  }

  const maxKategoriDeger = kategoriStats[0]?.[1].deger ?? 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-full space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stok Takibi</h1>
          <p className="text-sm text-slate-400 mt-0.5">Klinik envanter ve malzeme yönetimi</p>
        </div>
        <button
          onClick={openYeni}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Yeni Ürün Ekle
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="p-2 bg-blue-50 rounded-xl w-fit mb-3">
            <Package size={18} className="text-blue-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ürün Çeşidi</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stokListesi.length}</p>
          <p className="text-xs text-slate-400 mt-1">{stokListesi.reduce((s, k) => s + k.adet, 0)} toplam adet</p>
        </div>

        <div className={clsx(
          "rounded-2xl border shadow-sm p-5",
          kritikStoklar.length > 0 ? "bg-rose-50 border-rose-100" : "bg-white border-slate-100"
        )}>
          <div className={clsx("p-2 rounded-xl w-fit mb-3", kritikStoklar.length > 0 ? "bg-rose-100" : "bg-slate-50")}>
            <AlertTriangle size={18} className={kritikStoklar.length > 0 ? "text-rose-600" : "text-slate-400"} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kritik Stok</p>
          <p className={clsx("text-3xl font-bold mt-1", kritikStoklar.length > 0 ? "text-rose-700" : "text-slate-900")}>
            {kritikStoklar.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">{kritikStoklar.length > 0 ? "acil sipariş gerekiyor" : "stok yeterli"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="p-2 bg-emerald-50 rounded-xl w-fit mb-3">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Değer</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{currency(toplamDeger)}</p>
          <p className="text-xs text-slate-400 mt-1">envanter maliyeti</p>
        </div>

        <div className={clsx(
          "rounded-2xl border shadow-sm p-5",
          yakindaSonacak.length > 0 ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"
        )}>
          <div className={clsx("p-2 rounded-xl w-fit mb-3", yakindaSonacak.length > 0 ? "bg-amber-100" : "bg-slate-50")}>
            <Clock size={18} className={yakindaSonacak.length > 0 ? "text-amber-600" : "text-slate-400"} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SKT Uyarısı</p>
          <p className={clsx("text-3xl font-bold mt-1", yakindaSonacak.length > 0 ? "text-amber-700" : "text-slate-900")}>
            {yakindaSonacak.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">60 gün içinde sona eriyor</p>
        </div>
      </div>

      {/* ── Critical Alert + Category Breakdown ── */}
      {stokListesi.length > 0 && (
        <div className={clsx("grid grid-cols-1 gap-6", kritikStoklar.length > 0 ? "lg:grid-cols-2" : "")}>

          {/* Critical items */}
          {kritikStoklar.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={15} className="text-rose-600" />
                <h2 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Kritik Stok Listesi</h2>
              </div>
              <div className="space-y-2">
                {kritikStoklar.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-rose-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.urun_adi}</p>
                      <p className="text-xs text-slate-400">{s.kategori}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-lg font-bold text-rose-700 tabular-nums">{s.adet}</p>
                      <p className="text-xs text-slate-400">min. {s.kritik_seviye}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package size={15} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kategori Özeti</h2>
            </div>
            <div className="space-y-4">
              {kategoriStats.map(([kat, stat]) => {
                const style = KATEGORI_STYLE[kat as Kategori] ?? { bg: "bg-slate-50", text: "text-slate-600", bar: "bg-slate-400" };
                return (
                  <div key={kat} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", style.bg, style.text)}>{kat}</span>
                        {stat.kritik > 0 && (
                          <span className="text-xs text-rose-500 font-medium">{stat.kritik} kritik</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                        <span className="text-slate-400">{stat.urunSayisi} çeşit · {stat.adet} adet</span>
                        <span className="font-semibold text-slate-700 tabular-nums">{currency(stat.deger)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx("h-full rounded-full transition-all duration-700", style.bar)}
                        style={{ width: `${maxKategoriDeger > 0 ? (stat.deger / maxKategoriDeger) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 py-4 border-b border-slate-50">
          <div className="flex items-center flex-1 max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-blue-200">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün ara…"
              className="bg-transparent outline-none text-sm text-slate-700 w-full"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-slate-300 hover:text-slate-500">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value as Kategori | "")}
              className="bg-transparent outline-none text-sm text-slate-700"
            >
              <option value="">Tüm Kategoriler</option>
              {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-400 sm:ml-auto shrink-0">{tableData.length} ürün</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-50">
                <th className="px-5 py-3 text-left">Ürün</th>
                <th className="px-5 py-3 text-left">Kategori</th>
                <th className="px-5 py-3 text-left">Stok Durumu</th>
                <th className="px-5 py-3 text-left">Son Kul. Tarihi</th>
                <th className="px-5 py-3 text-right">Birim Fiyat</th>
                <th className="px-5 py-3 text-right">Toplam Değer</th>
                <th className="px-5 py-3 text-center w-20">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">Yükleniyor…</td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-300">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                tableData.map((s) => {
                  const isKritik = s.adet <= s.kritik_seviye;
                  const style = KATEGORI_STYLE[s.kategori] ?? { bg: "bg-slate-50", text: "text-slate-600", bar: "" };
                  return (
                    <tr
                      key={s.id}
                      className={clsx("hover:bg-slate-50 transition-colors", isKritik && "bg-rose-50/40")}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{s.urun_adi}</p>
                        {s.notlar && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{s.notlar}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full", style.bg, style.text)}>
                          {s.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StockBar adet={s.adet} kritikSeviye={s.kritik_seviye} />
                        <p className="text-[10px] text-slate-400 mt-1">min. {s.kritik_seviye}</p>
                      </td>
                      <td className="px-5 py-4">
                        {s.son_kullanma_tarihi
                          ? <ExpiryBadge date={s.son_kullanma_tarihi} />
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600 tabular-nums">{currency(s.birim_fiyat)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800 tabular-nums">
                        {currency(s.adet * s.birim_fiyat)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {tableData.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 flex justify-between text-xs text-slate-400">
            <span>{tableData.length} ürün listeleniyor</span>
            <span className="font-semibold text-slate-600 tabular-nums">
              Toplam: {currency(tableData.reduce((s, k) => s + k.adet * k.birim_fiyat, 0))}
            </span>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setModalOpen(null)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-7">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-2 mb-6">
                <Package size={20} className="text-blue-500" />
                <h3 className="text-lg font-bold text-slate-800">
                  {modalOpen === "yeni" ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ürün Adı</label>
                  <input
                    required
                    value={form.urun_adi}
                    onChange={(e) => setForm((f) => ({ ...f, urun_adi: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                    placeholder="ör. Botox 100U, Juvéderm Voluma…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kategori</label>
                    <select
                      value={form.kategori}
                      onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value as Kategori }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                    >
                      {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Birim Fiyat (₺)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      required
                      value={form.birim_fiyat}
                      onChange={(e) => setForm((f) => ({ ...f, birim_fiyat: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mevcut Adet</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.adet}
                      onChange={(e) => setForm((f) => ({ ...f, adet: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kritik Seviye</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.kritik_seviye}
                      onChange={(e) => setForm((f) => ({ ...f, kritik_seviye: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Son Kullanma Tarihi (SKT)</label>
                  <input
                    type="date"
                    value={form.son_kullanma_tarihi}
                    onChange={(e) => setForm((f) => ({ ...f, son_kullanma_tarihi: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notlar</label>
                  <textarea
                    rows={2}
                    value={form.notlar}
                    onChange={(e) => setForm((f) => ({ ...f, notlar: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 resize-none"
                    placeholder="Tedarikçi, parti no, ek bilgi…"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow transition disabled:opacity-70"
                >
                  {formLoading ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-7">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={18} className="text-rose-500" />
              <h3 className="text-base font-bold text-slate-800">Ürünü Sil</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 shadow disabled:opacity-70"
              >
                {deleteLoading ? "Siliniyor…" : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
