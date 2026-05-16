"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  X,
  Trash2,
  BarChart2,
  PieChart,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type HareketTipi = "Gelir" | "Gider";
type DateRange = "30g" | "3a" | "6a" | "1y" | "all";
type TipFilter = "Tümü" | HareketTipi;

interface Finans {
  id: string;
  tip: HareketTipi;
  kategori: string;
  aciklama: string;
  tutar: number;
  tarih: string;
  created_at: string;
}

interface FinansForm {
  tip: HareketTipi;
  kategori: string;
  aciklama: string;
  tutar: number;
  tarih: string;
  hasta_adi?: string;
  islem_adi?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GELIR_KATEGORILERI = ["Hizmet Bedeli", "Ürün Satışı", "Danışmanlık", "Diğer"];
const GIDER_KATEGORILERI = ["Kira", "Personel", "Malzeme Alımı", "Vergi", "Diğer"];

const DATE_LABELS: Record<DateRange, string> = {
  "30g": "Son 30 Gün",
  "3a": "Son 3 Ay",
  "6a": "Son 6 Ay",
  "1y": "Bu Yıl",
  "all": "Tüm Zamanlar",
};

const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStartDate(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "1y") return `${now.getFullYear()}-01-01`;
  const days = range === "30g" ? 30 : range === "3a" ? 90 : 180;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function shortMonth(k: string) {
  const m = parseInt(k.split("-")[1]) - 1;
  return TR_MONTHS[m] ?? k;
}

function currency(val: number) {
  return val.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinansPage() {
  const [hareketler, setHareketler] = useState<Finans[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("3a");
  const [tipFilter, setTipFilter] = useState<TipFilter>("Tümü");
  const [modalOpen, setModalOpen] = useState<null | HareketTipi>(null);
  const [form, setForm] = useState<FinansForm>({
    tip: "Gelir",
    kategori: "",
    aciklama: "",
    tutar: 0,
    tarih: new Date().toISOString().slice(0, 10),
  });
  const [kaydetLoading, setKaydetLoading] = useState(false);
  const [silLoading, setSilLoading] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchFinans() {
    setLoading(true);
    const { data } = await supabase
      .from("finans")
      .select("*")
      .order("tarih", { ascending: false })
      .order("created_at", { ascending: false });
    if (Array.isArray(data)) setHareketler(data as Finans[]);
    setLoading(false);
  }

  useEffect(() => { fetchFinans(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const startDate = useMemo(() => getStartDate(dateRange), [dateRange]);

  const filtered = useMemo(
    () => startDate ? hareketler.filter((h) => h.tarih >= startDate) : hareketler,
    [hareketler, startDate]
  );

  const gelir = useMemo(
    () => filtered.filter((h) => h.tip === "Gelir").reduce((s, h) => s + h.tutar, 0),
    [filtered]
  );
  const gider = useMemo(
    () => filtered.filter((h) => h.tip === "Gider").reduce((s, h) => s + h.tutar, 0),
    [filtered]
  );
  const netKar = gelir - gider;
  const karMarji = gelir > 0 ? Math.round((netKar / gelir) * 100) : 0;
  const gelirSayisi = filtered.filter((h) => h.tip === "Gelir").length;
  const giderSayisi = filtered.filter((h) => h.tip === "Gider").length;

  // Monthly trend (always show recent months regardless of filter, for context)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const monthCount =
      dateRange === "30g" ? 2 : dateRange === "3a" ? 3 : dateRange === "6a" ? 6 : dateRange === "1y" ? 12 : 6;
    const keys: string[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d.toISOString()));
    }
    return keys.map((k) => {
      const monthItems = hareketler.filter((h) => monthKey(h.tarih) === k);
      return {
        label: shortMonth(k),
        gelir: monthItems.filter((h) => h.tip === "Gelir").reduce((s, h) => s + h.tutar, 0),
        gider: monthItems.filter((h) => h.tip === "Gider").reduce((s, h) => s + h.tutar, 0),
      };
    });
  }, [hareketler, dateRange]);

  const trendMax = Math.max(...monthlyTrend.flatMap((d) => [d.gelir, d.gider]), 1);

  // Category breakdowns
  const gelirKategori = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.filter((h) => h.tip === "Gelir").forEach((h) => {
      c[h.kategori] = (c[h.kategori] ?? 0) + h.tutar;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const giderKategori = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.filter((h) => h.tip === "Gider").forEach((h) => {
      c[h.kategori] = (c[h.kategori] ?? 0) + h.tutar;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Table data
  const tableData = useMemo(() => {
    if (tipFilter === "Tümü") return filtered;
    return filtered.filter((h) => h.tip === tipFilter);
  }, [filtered, tipFilter]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function openModal(tip: HareketTipi) {
    setForm({ tip, kategori: "", aciklama: "", tutar: 0, tarih: new Date().toISOString().slice(0, 10), hasta_adi: "", islem_adi: "" });
    setModalOpen(tip);
  }

  async function handleFormSave(e: React.FormEvent) {
    e.preventDefault();
    setKaydetLoading(true);
    const builtAciklama = form.tip === "Gelir" && (form.hasta_adi || form.islem_adi)
      ? [form.hasta_adi, form.islem_adi, form.aciklama].filter(Boolean).join(" — ")
      : form.aciklama;
    const { error } = await supabase.from("finans").insert([{
      tip: form.tip, kategori: form.kategori, aciklama: builtAciklama,
      tutar: Number(form.tutar), tarih: form.tarih,
    }]);
    setKaydetLoading(false);
    if (!error) {
      setModalOpen(null);
      setForm({ tip: "Gelir", kategori: "", aciklama: "", tutar: 0, tarih: new Date().toISOString().slice(0, 10), hasta_adi: "", islem_adi: "" });
      fetchFinans();
    }
  }

  async function handleDelete(id: string) {
    setSilLoading(id);
    await supabase.from("finans").delete().eq("id", id);
    setSilLoading(null);
    fetchFinans();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-full space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finans</h1>
          <p className="text-sm text-slate-400 mt-0.5">Klinik gelir ve gider takibi</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period tabs */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
            {(["30g", "3a", "6a", "1y", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dateRange === r
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {DATE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => openModal("Gelir")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Plus size={15} /> Gelir Ekle
          </button>
          <button
            onClick={() => openModal("Gider")}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Minus size={15} /> Gider Ekle
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* Gelir */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {gelirSayisi} işlem
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dönem Geliri</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{currency(gelir)}</p>
          <p className="text-xs text-slate-400 mt-1">{DATE_LABELS[dateRange]}</p>
        </div>

        {/* Gider */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-rose-50 rounded-xl">
              <TrendingDown size={18} className="text-rose-500" />
            </div>
            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
              {giderSayisi} işlem
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dönem Gideri</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{currency(gider)}</p>
          <p className="text-xs text-slate-400 mt-1">{DATE_LABELS[dateRange]}</p>
        </div>

        {/* Net Kâr */}
        <div
          className={clsx(
            "rounded-2xl border shadow-sm p-5",
            netKar >= 0 ? "bg-white border-slate-100" : "bg-rose-50 border-rose-100"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={clsx("p-2.5 rounded-xl", netKar >= 0 ? "bg-emerald-50" : "bg-rose-100")}>
              <Wallet size={18} className={netKar >= 0 ? "text-emerald-600" : "text-rose-600"} />
            </div>
            {gelir > 0 && (
              <span
                className={clsx(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full",
                  karMarji >= 30 ? "text-emerald-600 bg-emerald-50" : karMarji >= 0 ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-100"
                )}
              >
                %{karMarji} marj
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Kâr</p>
          <p className={clsx("text-2xl font-bold mt-1 tabular-nums", netKar >= 0 ? "text-emerald-700" : "text-rose-700")}>
            {currency(netKar)}
          </p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            {gelir > 0 && (
              <div
                className={clsx("h-full rounded-full transition-all duration-700", netKar >= 0 ? "bg-emerald-400" : "bg-rose-400")}
                style={{ width: `${Math.min(Math.abs(karMarji), 100)}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Trend Chart + Category Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Comparison Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Aylık Karşılaştırma</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Gelir
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />Gider
              </span>
            </div>
          </div>

          {monthlyTrend.every((d) => d.gelir === 0 && d.gider === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-200">
              <BarChart2 size={40} strokeWidth={1} />
              <p className="text-sm mt-2 text-slate-300">Bu dönemde kayıt bulunamadı</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 h-36 mb-2">
                {monthlyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex items-end gap-0.5 h-full group">
                    <div
                      className="flex-1 bg-emerald-400 group-hover:bg-emerald-500 rounded-t transition-colors cursor-pointer"
                      style={{ height: `${Math.max((d.gelir / trendMax) * 100, d.gelir > 0 ? 3 : 0)}%` }}
                      title={`Gelir: ${currency(d.gelir)}`}
                    />
                    <div
                      className="flex-1 bg-rose-400 group-hover:bg-rose-500 rounded-t transition-colors cursor-pointer opacity-85"
                      style={{ height: `${Math.max((d.gider / trendMax) * 100, d.gider > 0 ? 3 : 0)}%` }}
                      title={`Gider: ${currency(d.gider)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {monthlyTrend.map((d, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-[10px] text-slate-400">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-xs text-slate-500">
                <span>En yüksek gelir: <strong className="text-slate-700">{currency(Math.max(...monthlyTrend.map(d => d.gelir)))}</strong></span>
                <span>En yüksek gider: <strong className="text-slate-700">{currency(Math.max(...monthlyTrend.map(d => d.gider)))}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <PieChart size={15} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kategori Dağılımı</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">

            {/* Gelir kategorileri */}
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">Gelir</p>
              {gelirKategori.length === 0 ? (
                <p className="text-xs text-slate-300">Kayıt yok</p>
              ) : (
                <div className="space-y-3">
                  {gelirKategori.map(([kat, val]) => (
                    <div key={kat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 truncate">{kat}</span>
                        <span className="font-bold text-slate-700 ml-2 tabular-nums shrink-0">{currency(val)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                          style={{ width: `${(val / gelirKategori[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gider kategorileri */}
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-3">Gider</p>
              {giderKategori.length === 0 ? (
                <p className="text-xs text-slate-300">Kayıt yok</p>
              ) : (
                <div className="space-y-3">
                  {giderKategori.map(([kat, val]) => (
                    <div key={kat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 truncate">{kat}</span>
                        <span className="font-bold text-slate-700 ml-2 tabular-nums shrink-0">{currency(val)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full transition-all duration-700"
                          style={{ width: `${(val / giderKategori[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
          <h2 className="text-sm font-bold text-slate-800">İşlem Geçmişi</h2>
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(["Tümü", "Gelir", "Gider"] as TipFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipFilter(t)}
                className={clsx(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                  tipFilter === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-50">
                <th className="px-6 py-3 text-left">Tarih</th>
                <th className="px-6 py-3 text-left">Tür</th>
                <th className="px-6 py-3 text-left">Kategori</th>
                <th className="px-6 py-3 text-left">Açıklama</th>
                <th className="px-6 py-3 text-right">Tutar</th>
                <th className="px-6 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">Yükleniyor…</td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-300">Bu dönemde kayıt yok.</td>
                </tr>
              ) : (
                tableData.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDate(h.tarih)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={clsx(
                          "text-xs font-bold px-2.5 py-1 rounded-full",
                          h.tip === "Gelir" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                        )}
                      >
                        {h.tip}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{h.kategori}</td>
                    <td className="px-6 py-3 text-slate-500 max-w-[220px] truncate">
                      {h.aciklama || <span className="text-slate-300">—</span>}
                    </td>
                    <td
                      className={clsx(
                        "px-6 py-3 text-right font-bold tabular-nums whitespace-nowrap",
                        h.tip === "Gelir" ? "text-emerald-700" : "text-rose-600"
                      )}
                    >
                      {h.tip === "Gelir" ? "+" : "−"}{currency(Math.abs(h.tutar))}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={silLoading === h.id}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        {silLoading === h.id
                          ? <RefreshCw size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {tableData.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-50 flex justify-between text-xs text-slate-400">
            <span>{tableData.length} kayıt gösteriliyor</span>
            <span className={clsx("font-bold", netKar >= 0 ? "text-emerald-600" : "text-rose-600")}>
              Net: {currency(netKar)}
            </span>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {modalOpen && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setModalOpen(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-7">
            <button
              onClick={() => setModalOpen(null)}
              className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-6">
              {modalOpen === "Gelir"
                ? <TrendingUp size={20} className="text-emerald-500" />
                : <TrendingDown size={20} className="text-rose-500" />}
              <h3 className="text-lg font-bold text-slate-800">
                {modalOpen === "Gelir" ? "Gelir Ekle" : "Gider Ekle"}
              </h3>
            </div>
            <form className="space-y-4" onSubmit={handleFormSave}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tutar (₺)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.tutar}
                  onChange={(e) => setForm((f) => ({ ...f, tutar: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kategori</label>
                <select
                  required
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                >
                  <option value="">Seçiniz…</option>
                  {(modalOpen === "Gelir" ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Gelir'e özgü hasta bilgileri */}
              {modalOpen === "Gelir" && (
                <div className="space-y-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Hasta Bilgileri (opsiyonel)</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hasta Adı</label>
                    <input
                      value={form.hasta_adi ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, hasta_adi: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 text-slate-700 text-sm bg-white"
                      placeholder="Örn: Ayşe Kaya"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">İşlem Adı</label>
                    <input
                      value={form.islem_adi ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, islem_adi: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 text-slate-700 text-sm bg-white"
                      placeholder="Örn: Rinoplasti, Botoks..."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Açıklama / Not</label>
                <input
                  value={form.aciklama}
                  onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                  placeholder="Opsiyonel"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tarih</label>
                <input
                  type="date"
                  required
                  value={form.tarih}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(null)}
                  disabled={kaydetLoading}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydetLoading}
                  className={clsx(
                    "px-5 py-2 rounded-xl text-white text-sm font-semibold shadow transition",
                    modalOpen === "Gelir"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-500 hover:bg-rose-600",
                    kaydetLoading && "opacity-70"
                  )}
                >
                  {kaydetLoading ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
