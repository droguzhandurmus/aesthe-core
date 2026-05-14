"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  Calendar,
  Wallet,
  TrendingUp,
  Activity,
  Award,
  Target,
  Zap,
  Eye,
  EyeOff,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = "7g" | "30g" | "3a" | "6a" | "1y";

interface Hasta {
  id: string;
  cinsiyet: string | null;
  dogum_tarihi: string | null;
  ulke: string | null;
  created_at: string;
}

interface Randevu {
  id: string;
  tarih: string;
  islem_turu: string | null;
  durum: string | null;
}

interface Finans {
  id: string;
  tarih: string;
  tip: "Gelir" | "Gider";
  tutar: number;
}

interface AmeliyatNotu {
  id: string;
  tarih: string;
  islem_adi: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_LABELS: Record<DateRange, string> = {
  "7g": "Son 7 Gün",
  "30g": "Son 30 Gün",
  "3a": "Son 3 Ay",
  "6a": "Son 6 Ay",
  "1y": "Bu Yıl",
};

function getRange(range: DateRange) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (range === "1y") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else {
    const days = range === "7g" ? 6 : range === "30g" ? 29 : range === "3a" ? 89 : 179;
    start = new Date(now);
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);
    prevStart.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart!.toISOString(),
    prevEnd: prevEnd!.toISOString(),
  };
}

function calcAge(dob: string): number {
  const today = new Date();
  const b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (
    today.getMonth() < b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())
  )
    age--;
  return age;
}

function currency(val: number) {
  return val.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// Monthly key helpers
function monthKey(iso: string) {
  return iso.slice(0, 7); // "YYYY-MM"
}
function dayKey(iso: string) {
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Inline SVG sparkline */
function Sparkline({
  values,
  color = "#3b82f6",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 72;
  const H = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const last = pts.split(" ").at(-1)!.split(",");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

/** Horizontal progress bar row */
function ProgressRow({
  label,
  value,
  maxVal,
  color = "bg-blue-500",
  badge,
}: {
  label: string;
  value: number;
  maxVal: number;
  color?: string;
  badge?: string;
}) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-slate-700 font-medium truncate">{label}</span>
          {badge && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-slate-800 tabular-nums ml-3 shrink-0">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Section header with show/hide toggle */
function SectionHeader({
  title,
  icon,
  visible,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
      </div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-500 transition-colors"
      >
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        <span>{visible ? "Gizle" : "Göster"}</span>
      </button>
    </div>
  );
}

/** Trend badge */
function TrendBadge({ change }: { change: number }) {
  if (change === 0)
    return (
      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        Stabil
      </span>
    );
  const pos = change > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
        pos ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"
      }`}
    >
      {pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}%{Math.abs(change)}
    </span>
  );
}

/** Country flag lookup */
function countryFlag(name: string): string {
  const map: Record<string, string> = {
    türkiye: "🇹🇷", turkey: "🇹🇷",
    almanya: "🇩🇪", germany: "🇩🇪",
    ingiltere: "🇬🇧", "united kingdom": "🇬🇧", uk: "🇬🇧",
    "suudi arabistan": "🇸🇦", saudi: "🇸🇦",
    hollanda: "🇳🇱", netherlands: "🇳🇱",
    fransa: "🇫🇷", france: "🇫🇷",
    abd: "🇺🇸", usa: "🇺🇸", "united states": "🇺🇸",
    avusturya: "🇦🇹", austria: "🇦🇹",
    isviçre: "🇨🇭", switzerland: "🇨🇭",
    belçika: "🇧🇪", belgium: "🇧🇪",
    azerbaycan: "🇦🇿", azerbaijan: "🇦🇿",
    irak: "🇮🇶", iraq: "🇮🇶",
    katar: "🇶🇦", qatar: "🇶🇦",
  };
  return map[name.toLowerCase()] ?? "🌍";
}

/** Insight/alert card */
function InsightCard({
  type,
  title,
  desc,
}: {
  type: "success" | "warning" | "info";
  title: string;
  desc: string;
}) {
  const s = {
    success: { bg: "bg-emerald-50", border: "border-emerald-100", bar: "bg-emerald-500", text: "text-emerald-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-100", bar: "bg-amber-400", text: "text-amber-700" },
    info: { bg: "bg-blue-50", border: "border-blue-100", bar: "bg-blue-500", text: "text-blue-700" },
  }[type];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${s.text}`}>{title}</p>
        <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IstatistiklerPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30g");
  const [loading, setLoading] = useState(true);
  const [hastalar, setHastalar] = useState<Hasta[]>([]);
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [finanslar, setFinanslar] = useState<Finans[]>([]);
  const [ameliyatlar, setAmeliyatlar] = useState<AmeliyatNotu[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setHidden((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const vis = (id: string) => !hidden.has(id);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [h, r, f, a] = await Promise.all([
        supabase.from("hastalar").select("id,cinsiyet,dogum_tarihi,ulke,created_at"),
        supabase.from("randevular").select("id,tarih,islem_turu,durum"),
        supabase.from("finans").select("id,tarih,tip,tutar"),
        supabase.from("ameliyat_notlari").select("id,tarih,islem_adi"),
      ]);
      if (!alive) return;
      setHastalar((h.data as Hasta[]) ?? []);
      setRandevular((r.data as Randevu[]) ?? []);
      setFinanslar((f.data as Finans[]) ?? []);
      setAmeliyatlar((a.data as AmeliyatNotu[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const { start, end, prevStart, prevEnd } = useMemo(() => getRange(dateRange), [dateRange]);

  const inRange = (d: string) => d >= start && d <= end;
  const inPrev  = (d: string) => d >= prevStart && d <= prevEnd;

  // Patients
  const hastaCount     = hastalar.length;
  const yeniHasta      = hastalar.filter((h) => inRange(h.created_at)).length;
  const prevYeniHasta  = hastalar.filter((h) => inPrev(h.created_at)).length;
  const hastaChange    = pctChange(yeniHasta, prevYeniHasta);

  // Appointments
  const randevuRange  = useMemo(() => randevular.filter((r) => inRange(r.tarih)), [randevular, start, end]);
  const randevuPrev   = useMemo(() => randevular.filter((r) => inPrev(r.tarih)),  [randevular, prevStart, prevEnd]);
  const randevuChange = pctChange(randevuRange.length, randevuPrev.length);

  // Financials
  const finansRange = useMemo(() => finanslar.filter((f) => inRange(f.tarih)),  [finanslar, start, end]);
  const finansPrev  = useMemo(() => finanslar.filter((f) => inPrev(f.tarih)),   [finanslar, prevStart, prevEnd]);
  const gelir       = finansRange.filter((f) => f.tip === "Gelir").reduce((s, f) => s + f.tutar, 0);
  const gider       = finansRange.filter((f) => f.tip === "Gider").reduce((s, f) => s + f.tutar, 0);
  const prevGelir   = finansPrev.filter((f) => f.tip === "Gelir").reduce((s, f) => s + f.tutar, 0);
  const netKar      = gelir - gider;
  const gelirChange = pctChange(gelir, prevGelir);
  const karMarji    = gelir > 0 ? Math.round((netKar / gelir) * 100) : 0;

  // Revenue trend bars
  const gelirTrend = useMemo((): { label: string; value: number }[] => {
    if (dateRange === "7g") {
      const keys: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        keys[dayKey(d.toISOString())] = 0;
      }
      finanslar.filter((f) => f.tip === "Gelir" && inRange(f.tarih)).forEach((f) => {
        const k = dayKey(f.tarih);
        if (k in keys) keys[k] += f.tutar;
      });
      return Object.entries(keys).map(([k, v]) => ({ label: k.slice(5), value: v }));
    }

    const monthCount =
      dateRange === "30g" ? 4 : dateRange === "3a" ? 3 : dateRange === "6a" ? 6 : 12;
    const now = new Date();
    const keys: Record<string, number> = {};
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys[monthKey(d.toISOString())] = 0;
    }
    finanslar
      .filter((f) => f.tip === "Gelir" && (dateRange === "1y" ? f.tarih.slice(0, 4) === String(now.getFullYear()) : inRange(f.tarih)))
      .forEach((f) => {
        const k = monthKey(f.tarih);
        if (k in keys) keys[k] += f.tutar;
      });
    return Object.entries(keys).map(([k, v]) => ({ label: k.slice(5), value: v }));
  }, [finanslar, dateRange, start, end]);

  // Sparkline data (last 7 months always, for KPI cards)
  const sparkMonths = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d.toISOString()));
    }
    return keys;
  }, []);

  const hastaSparkline = useMemo(
    () => sparkMonths.map((k) => hastalar.filter((h) => monthKey(h.created_at) === k).length),
    [hastalar, sparkMonths]
  );
  const randevuSparkline = useMemo(
    () => sparkMonths.map((k) => randevular.filter((r) => monthKey(r.tarih) === k).length),
    [randevular, sparkMonths]
  );
  const gelirSparkline = useMemo(
    () =>
      sparkMonths.map((k) =>
        finanslar.filter((f) => f.tip === "Gelir" && monthKey(f.tarih) === k).reduce((s, f) => s + f.tutar, 0)
      ),
    [finanslar, sparkMonths]
  );

  // Procedure performance (combine randevular + ameliyatlar)
  const islemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    randevuRange.forEach((r) => {
      if (r.islem_turu) counts[r.islem_turu] = (counts[r.islem_turu] ?? 0) + 1;
    });
    ameliyatlar.filter((a) => inRange(a.tarih)).forEach((a) => {
      if (a.islem_adi) counts[a.islem_adi] = (counts[a.islem_adi] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [randevuRange, ameliyatlar, start, end]);

  // Demographics
  const cinsiyetData = useMemo(() => {
    const c: Record<string, number> = { Kadın: 0, Erkek: 0 };
    hastalar.forEach((h) => {
      const k = h.cinsiyet === "Kadın" || h.cinsiyet === "kadın" ? "Kadın" :
                h.cinsiyet === "Erkek" || h.cinsiyet === "erkek" ? "Erkek" : null;
      if (k) c[k]++;
    });
    return c;
  }, [hastalar]);

  const yasData = useMemo(() => {
    const g: Record<string, number> = { "18–24": 0, "25–34": 0, "35–44": 0, "45–54": 0, "55+": 0 };
    hastalar.forEach((h) => {
      if (!h.dogum_tarihi) return;
      const age = calcAge(h.dogum_tarihi);
      if (age < 18) return;
      if (age <= 24) g["18–24"]++;
      else if (age <= 34) g["25–34"]++;
      else if (age <= 44) g["35–44"]++;
      else if (age <= 54) g["45–54"]++;
      else g["55+"]++;
    });
    return g;
  }, [hastalar]);

  const ulkeData = useMemo(() => {
    const c: Record<string, number> = {};
    hastalar.forEach((h) => { const u = h.ulke || "Belirtilmemiş"; c[u] = (c[u] ?? 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [hastalar]);

  // Appointment status
  const durumData = useMemo(() => {
    const c: Record<string, number> = {};
    randevuRange.forEach((r) => { const d = r.durum || "Belirsiz"; c[d] = (c[d] ?? 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [randevuRange]);

  const durumColors: Record<string, string> = {
    onaylandi: "bg-emerald-500", onaylandı: "bg-emerald-500", onaylı: "bg-emerald-500",
    tamamlandi: "bg-blue-500", tamamlandı: "bg-blue-500",
    bekliyor: "bg-amber-400",
    iptal: "bg-rose-400", "iptal edildi": "bg-rose-400",
    gelmedi: "bg-orange-400",
  };

  // Insights (rules-based)
  const insights = useMemo(() => {
    const list: { type: "success" | "warning" | "info"; title: string; desc: string }[] = [];

    if (gelirChange >= 10)
      list.push({ type: "success", title: "Gelir artışı", desc: `Önceki döneme göre gelir %${gelirChange} arttı. Momentum korunuyor.` });
    else if (gelirChange <= -10)
      list.push({ type: "warning", title: "Gelir düşüşü", desc: `Gelir önceki döneme göre %${Math.abs(gelirChange)} azaldı. İncelemeniz önerilir.` });

    if (hastaChange >= 15)
      list.push({ type: "success", title: "Hasta artışı", desc: `Bu dönem ${yeniHasta} yeni hasta kayıt oldu — önceki döneme göre %${hastaChange} fazla.` });

    if (islemCounts.length > 0)
      list.push({ type: "info", title: `En yoğun işlem: ${islemCounts[0][0]}`, desc: `${islemCounts[0][1]} randevu ile bu dönemin önde gelen hizmetiydi.` });

    if (netKar < 0)
      list.push({ type: "warning", title: "Net zarar", desc: `Bu dönemde ${currency(Math.abs(netKar))} zarar oluştu. Gider kalemlerini gözden geçirin.` });
    else if (karMarji > 40)
      list.push({ type: "success", title: "Yüksek karlılık", desc: `Net kar marjı %${karMarji} — plastik cerrahi sektörünün üzerinde bir performans.` });

    if (hastaCount > 0) {
      const kadin = cinsiyetData["Kadın"];
      const oran = Math.round((kadin / hastaCount) * 100);
      if (oran > 0)
        list.push({ type: "info", title: "Hasta profili", desc: `Kayıtlı hastaların %${oran}'i kadın — bu oran estetik cerrahi ortalamalarıyla uyumlu.` });
    }

    return list.slice(0, 4);
  }, [gelirChange, hastaChange, yeniHasta, islemCounts, netKar, karMarji, hastaCount, cinsiyetData]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-blue-300 animate-spin" />
          <p className="text-sm text-slate-400">Veriler yükleniyor…</p>
        </div>
      </div>
    );
  }

  const trendMax = Math.max(...gelirTrend.map((d) => d.value), 1);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-full space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">İstatistikler</h1>
          <p className="text-sm text-slate-400 mt-0.5">Kliniğinizin gerçek zamanlı performans özeti</p>
        </div>

        {/* Date Range Tabs */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm self-start sm:self-auto">
          {(["7g", "30g", "3a", "6a", "1y"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateRange === r
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {DATE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* Toplam Hasta */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Users size={18} className="text-blue-600" />
            </div>
            <Sparkline values={hastaSparkline} color="#3b82f6" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Hasta</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{hastaCount}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-400">Bu dönem +{yeniHasta} yeni</span>
            <TrendBadge change={hastaChange} />
          </div>
        </div>

        {/* Randevular */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Calendar size={18} className="text-indigo-600" />
            </div>
            <Sparkline values={randevuSparkline} color="#6366f1" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dönem Randevuları</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{randevuRange.length}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-400">Önceki dönem: {randevuPrev.length}</span>
            <TrendBadge change={randevuChange} />
          </div>
        </div>

        {/* Gelir */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <Sparkline values={gelirSparkline} color="#10b981" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dönem Geliri</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{currency(gelir)}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-400">Gider: {currency(gider)}</span>
            <TrendBadge change={gelirChange} />
          </div>
        </div>

        {/* Net Kâr */}
        <div
          className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow ${
            netKar >= 0 ? "bg-white border-slate-100" : "bg-rose-50 border-rose-100"
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${netKar >= 0 ? "bg-emerald-50" : "bg-rose-100"}`}>
              <Wallet size={18} className={netKar >= 0 ? "text-emerald-600" : "text-rose-600"} />
            </div>
            {gelir > 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  karMarji >= 30 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                }`}
              >
                %{karMarji} marj
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Kâr</p>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${netKar >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {currency(netKar)}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              {gelir > 0 && (
                <div
                  className={`h-full rounded-full transition-all ${netKar >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                  style={{ width: `${Math.min(Math.abs(karMarji), 100)}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gelir Trendi + İşlem Performansı ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gelir Trendi */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <SectionHeader
            title="Gelir Trendi"
            icon={<Activity size={15} />}
            visible={vis("trend")}
            onToggle={() => toggleSection("trend")}
          />
          {vis("trend") && (
            gelirTrend.every((d) => d.value === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                <BarChart2 size={40} strokeWidth={1} />
                <p className="text-sm mt-2 text-slate-300">Bu dönemde gelir kaydı bulunamadı</p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-1.5 h-36 mb-2">
                  {gelirTrend.map((d, i) => {
                    const h = Math.max((d.value / trendMax) * 100, d.value > 0 ? 5 : 0);
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
                        title={`${d.label}: ${currency(d.value)}`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                          <div className="bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap">
                            {currency(d.value)}
                          </div>
                        </div>
                        <div
                          className="w-full rounded-t-md bg-blue-400 hover:bg-blue-600 transition-colors cursor-pointer"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mb-4">
                  {gelirTrend.map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                      <span className="text-[10px] text-slate-400">{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs text-slate-500">
                  <span>
                    Toplam:{" "}
                    <strong className="text-slate-700">{currency(gelir)}</strong>
                  </span>
                  <span>
                    Ort:{" "}
                    <strong className="text-slate-700">
                      {currency(
                        Math.round(gelir / Math.max(gelirTrend.filter((d) => d.value > 0).length, 1))
                      )}
                    </strong>
                  </span>
                </div>
              </>
            )
          )}
        </div>

        {/* İşlem Performansı */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <SectionHeader
            title="En Çok Yapılan İşlemler"
            icon={<Award size={15} />}
            visible={vis("islem")}
            onToggle={() => toggleSection("islem")}
          />
          {vis("islem") && (
            islemCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                <Target size={40} strokeWidth={1} />
                <p className="text-sm mt-2 text-slate-300">Bu dönemde kayıtlı işlem bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {islemCounts.map(([islem, count], i) => (
                  <ProgressRow
                    key={islem}
                    label={islem}
                    value={count}
                    maxVal={islemCounts[0][1]}
                    badge={i === 0 ? "En popüler" : undefined}
                    color={
                      ["bg-blue-500", "bg-indigo-400", "bg-violet-400", "bg-sky-400", "bg-cyan-400", "bg-teal-400", "bg-emerald-400", "bg-blue-300"][i % 8]
                    }
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Demografi + Ülkeler + Randevu Durumu ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Hasta Demografisi */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <SectionHeader
            title="Hasta Demografisi"
            icon={<Users size={15} />}
            visible={vis("demog")}
            onToggle={() => toggleSection("demog")}
          />
          {vis("demog") && (
            <div className="space-y-6">
              {/* Cinsiyet */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Cinsiyet</p>
                {Object.entries(cinsiyetData).filter(([, v]) => v > 0).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(cinsiyetData).filter(([, v]) => v > 0).map(([c, v]) => {
                      const total = Object.values(cinsiyetData).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                      const color = c === "Kadın" ? "bg-pink-400" : "bg-blue-400";
                      return (
                        <div key={c} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{c}</span>
                            <span className="text-slate-800 font-bold">{v} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full">
                            <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">Cinsiyet verisi yok</p>
                )}
              </div>

              {/* Yaş Dağılımı */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Yaş Dağılımı</p>
                {Object.values(yasData).some((v) => v > 0) ? (
                  <div className="space-y-2">
                    {Object.entries(yasData).map(([group, count]) => {
                      const maxY = Math.max(...Object.values(yasData), 1);
                      return (
                        <div key={group} className="flex items-center gap-2.5">
                          <span className="text-xs text-slate-500 w-12 shrink-0">{group}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-300 rounded-full transition-all duration-700"
                              style={{ width: `${(count / maxY) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-4 text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">Doğum tarihi verisi yok</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ülke Dağılımı */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <SectionHeader
            title="Hasta Ülkeleri"
            icon={<Globe size={15} />}
            visible={vis("ulke")}
            onToggle={() => toggleSection("ulke")}
          />
          {vis("ulke") && (
            ulkeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                <Globe size={40} strokeWidth={1} />
                <p className="text-sm mt-2 text-slate-300">Ülke verisi yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ulkeData.map(([ulke, count], i) => (
                  <div key={ulke} className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{countryFlag(ulke)}</span>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700 font-medium truncate">{ulke}</span>
                        <span className="text-sm font-bold text-slate-800 ml-2 shrink-0 tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            ["bg-blue-500","bg-indigo-400","bg-violet-400","bg-sky-400","bg-teal-400","bg-cyan-400"][i % 6]
                          }`}
                          style={{ width: `${(count / ulkeData[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Randevu Durumları */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <SectionHeader
            title="Randevu Durumları"
            icon={<Calendar size={15} />}
            visible={vis("durum")}
            onToggle={() => toggleSection("durum")}
          />
          {vis("durum") && (
            durumData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                <Calendar size={40} strokeWidth={1} />
                <p className="text-sm mt-2 text-slate-300">Bu dönemde randevu yok</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {durumData.map(([durum, count]) => {
                    const total = randevuRange.length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const color = durumColors[durum.toLowerCase()] ?? "bg-slate-300";
                    return (
                      <div key={durum} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 capitalize">{durum}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">%{pct}</span>
                            <span className="text-sm font-bold text-slate-800 tabular-nums">{count}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between text-xs text-slate-400">
                  <span>Toplam randevu</span>
                  <span className="font-bold text-slate-600 tabular-nums">{randevuRange.length}</span>
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* ── Öngörüler ── */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Öngörüler & Uyarılar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
          </div>
        </div>
      )}

      {/* ── Quick Summary ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Hızlı Özet — {DATE_LABELS[dateRange]}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Toplam Hasta", value: hastaCount.toString(), color: "" },
            { label: "Dönem Randevusu", value: randevuRange.length.toString(), color: "" },
            { label: "Dönem Geliri", value: currency(gelir), color: "text-emerald-600" },
            { label: "Net Kâr", value: currency(netKar), color: netKar >= 0 ? "text-emerald-600" : "text-rose-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 mb-1">{label}</p>
              <p className={`text-base font-bold ${color || "text-slate-800"} tabular-nums`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
