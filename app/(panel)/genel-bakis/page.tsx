"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Users, Calendar, Wallet, Clock, Package, UserPlus, CreditCard,
  CalendarCheck2, Plus, X, Pencil, Check, RefreshCw, TrendingUp,
  Zap, AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type WidgetType =
  | "toplam_hasta" | "randevular" | "gelir" | "net_kar"
  | "bekleyen_randevular" | "yeni_hastalar" | "odeme_bekleyen"
  | "kritik_stok" | "randevu_listesi" | "son_hastalar" | "hizli_islemler";

type DateRangeKey = "bugun" | "bu_hafta" | "bu_ay" | "bu_yil";

interface WidgetCfg {
  id: string;
  type: WidgetType;
  dateRange?: DateRangeKey;
  cols: 1 | 2 | 4;
  rows: 1 | 2;
}

interface CatalogItem {
  type: WidgetType;
  label: string;
  desc: string;
  defaultCols: 1 | 2 | 4;
  defaultRows: 1 | 2;
  hasDateRange: boolean;
  color: string;
  icon: React.ElementType;
}

interface RandevuRow {
  id: string; tarih: string; islem_turu: string | null;
  durum: string | null; sure_dk: number | null; hasta_id: string; hasta_adi: string;
}

interface DashData {
  toplamHasta: number; odemeBekleyen: number; bekleyenRandevu: number;
  kritikStok: number; randevular: RandevuRow[];
  gelirItems: { tarih: string; tutar: number }[];
  giderItems: { tarih: string; tutar: number }[];
  hastaCreatedAt: string[];
  sonHastalar: { id: string; ad_soyad: string; islem: string | null; created_at: string }[];
}

interface WidgetPos { x: number; y: number; w: number; h: number; }

// ─── Grid Layout Engine ───────────────────────────────────────────────────────
const GAP = 16;
const ROW_H = 175; // single-row height in px

function computeGridLayout(widgetList: WidgetCfg[], containerW: number): Record<string, WidgetPos> {
  if (!containerW) return {};
  const colW = (containerW - 3 * GAP) / 4;
  const grid: boolean[][] = [];
  const result: Record<string, WidgetPos> = {};

  const ensureRows = (n: number) => {
    while (grid.length < n) grid.push([false, false, false, false]);
  };

  const findSlot = (cols: number, rows: number): [col: number, row: number] => {
    for (let r = 0; ; r++) {
      ensureRows(r + rows);
      colLoop: for (let c = 0; c <= 4 - cols; c++) {
        for (let dr = 0; dr < rows; dr++)
          for (let dc = 0; dc < cols; dc++)
            if (grid[r + dr]?.[c + dc]) continue colLoop;
        return [c, r];
      }
    }
  };

  for (const w of widgetList) {
    const [c, r] = findSlot(w.cols, w.rows);
    ensureRows(r + w.rows);
    for (let dr = 0; dr < w.rows; dr++)
      for (let dc = 0; dc < w.cols; dc++)
        grid[r + dr][c + dc] = true;

    result[w.id] = {
      x: c * (colW + GAP),
      y: r * (ROW_H + GAP),
      w: w.cols * colW + (w.cols - 1) * GAP,
      h: w.rows * ROW_H + (w.rows - 1) * GAP,
    };
  }
  return result;
}

// Given ghost center (cx, cy), find the best insertion index among `others`
function computeInsertOrder(
  cx: number, cy: number,
  dragged: WidgetCfg,
  others: WidgetCfg[],
  othersLayout: Record<string, WidgetPos>,
): WidgetCfg[] {
  let bestIdx = others.length;
  let bestDist = Infinity;

  others.forEach((w, i) => {
    const p = othersLayout[w.id];
    if (!p) return;
    const wcx = p.x + p.w / 2;
    const wcy = p.y + p.h / 2;
    const dist = Math.hypot(cx - wcx, cy - wcy);
    if (dist < bestDist) {
      bestDist = dist;
      // vertical bias: if ghost is clearly above/below the widget centre use that
      if (cy < wcy - p.h * 0.25)      bestIdx = i;       // insert before
      else if (cy > wcy + p.h * 0.25) bestIdx = i + 1;   // insert after
      else                             bestIdx = cx < wcx ? i : i + 1;
    }
  });

  const arr = [...others];
  arr.splice(bestIdx, 0, dragged);
  return arr;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DR_SHORT: Record<DateRangeKey, string> = { bugun: "G", bu_hafta: "H", bu_ay: "A", bu_yil: "Y" };
const DR_LABELS: Record<DateRangeKey, string> = { bugun: "Bugün", bu_hafta: "Bu Hafta", bu_ay: "Bu Ay", bu_yil: "Bu Yıl" };
const DATE_RANGES: DateRangeKey[] = ["bugun", "bu_hafta", "bu_ay", "bu_yil"];

const CATALOG: CatalogItem[] = [
  { type: "toplam_hasta",        label: "Toplam Hasta",    desc: "Kayıtlı hasta sayısı",       defaultCols: 1, defaultRows: 1, hasDateRange: false, color: "blue",    icon: Users },
  { type: "randevular",          label: "Randevular",      desc: "Dönem randevu sayısı",        defaultCols: 1, defaultRows: 1, hasDateRange: true,  color: "indigo",  icon: Calendar },
  { type: "gelir",               label: "Gelir",           desc: "Dönem geliri (₺)",            defaultCols: 1, defaultRows: 1, hasDateRange: true,  color: "emerald", icon: Wallet },
  { type: "net_kar",             label: "Net Kâr",         desc: "Gelir eksi gider",            defaultCols: 1, defaultRows: 1, hasDateRange: true,  color: "teal",    icon: TrendingUp },
  { type: "bekleyen_randevular", label: "Bekleyen",        desc: "Onay bekleyen randevular",    defaultCols: 1, defaultRows: 1, hasDateRange: false, color: "amber",   icon: Clock },
  { type: "yeni_hastalar",       label: "Yeni Hasta",      desc: "Dönemde kayıt edilenler",     defaultCols: 1, defaultRows: 1, hasDateRange: true,  color: "violet",  icon: UserPlus },
  { type: "odeme_bekleyen",      label: "Ödeme Bekleyen",  desc: "Ödenmemiş randevular",        defaultCols: 1, defaultRows: 1, hasDateRange: false, color: "rose",    icon: CreditCard },
  { type: "kritik_stok",         label: "Kritik Stok",     desc: "Stok uyarısı olanlar",        defaultCols: 1, defaultRows: 1, hasDateRange: false, color: "orange",  icon: Package },
  { type: "randevu_listesi",     label: "Randevu Listesi", desc: "Listeleyerek göster",         defaultCols: 4, defaultRows: 1, hasDateRange: true,  color: "blue",    icon: CalendarCheck2 },
  { type: "son_hastalar",        label: "Son Hastalar",    desc: "En son eklenen hastalar",     defaultCols: 2, defaultRows: 1, hasDateRange: false, color: "slate",   icon: Users },
  { type: "hizli_islemler",      label: "Hızlı İşlemler",  desc: "Kısayollar",                  defaultCols: 2, defaultRows: 1, hasDateRange: false, color: "blue",    icon: Zap },
];

const DEFAULT_WIDGETS: WidgetCfg[] = [
  { id: "w1", type: "toplam_hasta",        cols: 1, rows: 1 },
  { id: "w2", type: "randevular",          cols: 1, rows: 1, dateRange: "bugun" },
  { id: "w3", type: "gelir",              cols: 1, rows: 1, dateRange: "bu_ay" },
  { id: "w4", type: "bekleyen_randevular", cols: 1, rows: 1 },
  { id: "w5", type: "randevu_listesi",     cols: 4, rows: 1, dateRange: "bugun" },
  { id: "w6", type: "son_hastalar",        cols: 2, rows: 1 },
  { id: "w7", type: "hizli_islemler",      cols: 2, rows: 1 },
];

const C_BG: Record<string, string> = {
  blue: "bg-blue-50", indigo: "bg-indigo-50", emerald: "bg-emerald-50",
  teal: "bg-teal-50", amber: "bg-amber-50", violet: "bg-violet-50",
  rose: "bg-rose-50", orange: "bg-orange-50", slate: "bg-slate-100",
};
const C_TEXT: Record<string, string> = {
  blue: "text-blue-600", indigo: "text-indigo-600", emerald: "text-emerald-600",
  teal: "text-teal-600", amber: "text-amber-600", violet: "text-violet-600",
  rose: "text-rose-600", orange: "text-orange-600", slate: "text-slate-500",
};

const RANDEVU_DURUM_STYLE: Record<string, string> = {
  Bekliyor: "bg-amber-100 text-amber-700",
  Onaylandı: "bg-emerald-100 text-emerald-700",
  Tamamlandı: "bg-blue-100 text-blue-700",
  İptal: "bg-red-100 text-red-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStartDate(range: DateRangeKey): string {
  const now = new Date();
  if (range === "bugun") return now.toISOString().slice(0, 10);
  if (range === "bu_hafta") {
    const d = new Date(now);
    const day = d.getDay(); const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff); return d.toISOString().slice(0, 10);
  }
  if (range === "bu_ay") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return `${now.getFullYear()}-01-01`;
}

function filterByRange<T extends { tarih: string }>(items: T[], range: DateRangeKey): T[] {
  const start = getStartDate(range);
  const today = new Date().toISOString().slice(0, 10);
  return items.filter((i) => i.tarih >= start && i.tarih <= today + "T23:59:59");
}

function currency(v: number) {
  return v >= 1000
    ? `₺${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}B`
    : `₺${Math.round(v).toLocaleString("tr-TR")}`;
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function formatTurkishDate(d: Date) {
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getCatalog(type: WidgetType): CatalogItem {
  return CATALOG.find((c) => c.type === type)!;
}

// ─── DateRange Tabs ───────────────────────────────────────────────────────────
function DateRangeTabs({ value, onChange }: { value: DateRangeKey; onChange: (v: DateRangeKey) => void }) {
  return (
    <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0"
      onPointerDown={(e) => e.stopPropagation()}>
      {DATE_RANGES.map((dr) => (
        <button key={dr} title={DR_LABELS[dr]}
          onClick={(e) => { e.stopPropagation(); onChange(dr); }}
          className={`w-6 h-6 text-[10px] font-bold rounded-md transition-all ${
            value === dr ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
          }`}>
          {DR_SHORT[dr]}
        </button>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ cat, value, subLabel, loading, dateRange, onDateRangeChange }: {
  cat: CatalogItem; value: string | number; subLabel?: string; loading: boolean;
  dateRange?: DateRangeKey; onDateRangeChange?: (v: DateRangeKey) => void;
}) {
  const Icon = cat.icon;
  return (
    <div className="h-full p-4 flex flex-col select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 ${C_BG[cat.color]} rounded-xl shrink-0`}>
          <Icon size={16} className={C_TEXT[cat.color]} />
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{cat.label}</p>
      </div>
      {loading
        ? <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
        : <p className="text-2xl font-bold text-slate-800 tabular-nums leading-tight">{value}</p>
      }
      {subLabel && <p className="text-xs text-slate-400 mt-0.5">{subLabel}</p>}
      {dateRange && onDateRangeChange && (
        <div className="mt-auto pt-3">
          <DateRangeTabs value={dateRange} onChange={onDateRangeChange} />
        </div>
      )}
    </div>
  );
}

// ─── Randevu Listesi Widget ───────────────────────────────────────────────────
function RandevuListeWidget({ randevular, loading, dateRange, onDateRangeChange, rows }: {
  randevular: RandevuRow[]; loading: boolean; dateRange: DateRangeKey;
  onDateRangeChange: (v: DateRangeKey) => void; rows: number;
}) {
  const filtered = filterByRange(randevular, dateRange).sort((a, b) => a.tarih.localeCompare(b.tarih));
  return (
    <div className="h-full flex flex-col select-none">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarCheck2 size={15} className="text-blue-500" />
          <h2 className="text-sm font-bold text-slate-800">Randevu Listesi</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} randevu</span>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeTabs value={dateRange} onChange={onDateRangeChange} />
          <Link href="/randevular/tum-randevular" onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
            Tümünü Gör →
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-slate-400">
            <CalendarCheck2 size={32} className="mb-2 opacity-20" />
            <p className="text-sm">{DR_LABELS[dateRange]} için randevu bulunmuyor</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.slice(0, rows >= 2 ? 12 : 5).map((r) => {
              const raw = r.islem_turu ?? "Belirtilmedi";
              const ci = raw.indexOf(": ");
              const islem = ci !== -1 ? raw.slice(ci + 2) : raw;
              const durum = r.durum ?? "Bekliyor";
              const time = new Date(r.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">{initials(r.hasta_adi)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{r.hasta_adi}</p>
                    <p className="text-xs text-slate-400 truncate">{islem}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${RANDEVU_DURUM_STYLE[durum] ?? "bg-slate-100 text-slate-500"}`}>{durum}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-700">{time}</p>
                    {r.sure_dk && <p className="text-xs text-slate-400">{r.sure_dk}dk</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Son Hastalar Widget ──────────────────────────────────────────────────────
function SonHastalarWidget({ hastalar, loading, rows }: {
  hastalar: { id: string; ad_soyad: string; islem: string | null; created_at: string }[];
  loading: boolean; rows: number;
}) {
  return (
    <div className="h-full flex flex-col select-none">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-800">Son Hastalar</h2>
        </div>
        <Link href="/hastalar/hasta-listesi" onPointerDown={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium">Tümü →</Link>
      </div>
      {loading
        ? <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
        : hastalar.length === 0
          ? <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">Henüz hasta yok</div>
          : (
            <div className="divide-y divide-slate-50 flex-1 overflow-auto">
              {hastalar.slice(0, rows >= 2 ? 8 : 4).map((h) => (
                <Link key={h.id} href={`/hastalar/hasta-listesi/${h.id}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">{initials(h.ad_soyad)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{h.ad_soyad}</p>
                    {h.islem && <p className="text-xs text-slate-400 truncate">{h.islem}</p>}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(h.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))}
            </div>
          )
      }
    </div>
  );
}

// ─── Hızlı İşlemler Widget ────────────────────────────────────────────────────
function HizliIslemlerWidget({ cols }: { cols: number }) {
  const actions = [
    { label: "Yeni Hasta",    href: "/hastalar/yeni-hasta",       icon: UserPlus,      color: "blue" },
    { label: "Yeni Randevu",  href: "/randevular/klinik-listesi", icon: CalendarCheck2, color: "indigo" },
    { label: "Gelir Ekle",    href: "/raporlar/finans",           icon: Wallet,         color: "emerald" },
    { label: "Hasta Ara",     href: "/hastalar/hasta-listesi",    icon: Users,          color: "violet" },
    { label: "Stok Takibi",   href: "/raporlar/stok-takibi",      icon: Package,        color: "orange" },
    { label: "İstatistikler", href: "/raporlar/istatistikler",   icon: TrendingUp,     color: "teal" },
  ];
  const gridCols = cols >= 4 ? "grid-cols-6" : cols >= 2 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className="h-full p-4 flex flex-col select-none">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Zap size={14} className="text-blue-500" />
        <h2 className="text-sm font-bold text-slate-800">Hızlı İşlemler</h2>
      </div>
      <div className={`grid ${gridCols} gap-2 flex-1`}>
        {actions.map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href} onPointerDown={(e) => e.stopPropagation()}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl ${C_BG[color]} hover:brightness-95 transition-all`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-sm">
              <Icon size={15} className={C_TEXT[color]} />
            </div>
            <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Add Widget Panel ─────────────────────────────────────────────────────────
function AddWidgetPanel({ widgets, onAdd, onClose }: {
  widgets: WidgetCfg[]; onAdd: (type: WidgetType) => void; onClose: () => void;
}) {
  const activeTypes = new Set(widgets.map((w) => w.type));
  const available = CATALOG.filter((c) => !activeTypes.has(c.type));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl p-6 pb-8 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-800">Widget Ekle</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
        </div>
        {available.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Check size={32} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium">Tüm widgetlar eklendi!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {available.map((cat) => {
              const Icon = cat.icon;
              return (
                <button key={cat.type} onClick={() => onAdd(cat.type)}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group">
                  <div className={`p-2 ${C_BG[cat.color]} rounded-xl shrink-0`}><Icon size={15} className={C_TEXT[cat.color]} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{cat.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{cat.desc}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{cat.defaultCols}×{cat.defaultRows} varsayılan</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [widgets, setWidgets] = useState<WidgetCfg[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  // Grid container measurement
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    if (!gridRef.current) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(gridRef.current);
    setContainerW(gridRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // ── Drag state ────────────────────────────────────────────────────────────────
  // dragInfo: stable during a drag session (ref, not state)
  const dragInfoRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  // previewWidgets: live-reordered array while dragging
  const [previewWidgets, setPreviewWidgets] = useState<WidgetCfg[]>([]);
  const previewRef = useRef<WidgetCfg[]>([]);
  // ghost position in container coords
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerWRef = useRef(containerW);
  useEffect(() => { containerWRef.current = containerW; }, [containerW]);

  // ── Resize state ──────────────────────────────────────────────────────────────
  const [resizePreview, setResizePreview] = useState<{ id: string; cols: 1|2|4; rows: 1|2 } | null>(null);
  const resizePreviewRef = useRef(resizePreview);
  useEffect(() => { resizePreviewRef.current = resizePreview; }, [resizePreview]);

  // ── Persist/load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aesthecore_dashboard_v2");
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetCfg[];
        setWidgets(parsed.map((w) => ({
          ...w,
          cols: w.cols ?? (getCatalog(w.type)?.defaultCols ?? 1),
          rows: w.rows ?? (getCatalog(w.type)?.defaultRows ?? 1),
        })) as WidgetCfg[]);
      }
    } catch { /* use defaults */ }
    setTodayStr(formatTurkishDate(new Date()));
  }, []);

  const saveWidgets = useCallback((w: WidgetCfg[]) => {
    setWidgets(w);
    localStorage.setItem("aesthecore_dashboard_v2", JSON.stringify(w));
  }, []);

  // ── Data fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const [
      { count: toplamHasta }, { count: odemeBekleyen }, { count: bekleyenRandevu },
      { data: randevuRaw }, { data: finansRaw }, { data: sonHastalarRaw }, { data: hastaRaw },
    ] = await Promise.all([
      supabase.from("hastalar").select("*", { count: "exact", head: true }),
      supabase.from("hastalar").select("*", { count: "exact", head: true }).eq("durum", "Ödeme Bekliyor"),
      supabase.from("randevular").select("*", { count: "exact", head: true })
        .in("durum", ["Bekliyor", "Onaylandı"])
        .gte("tarih", new Date().toISOString().slice(0, 10) + "T00:00:00"),
      supabase.from("randevular")
        .select("id, tarih, islem_turu, durum, sure_dk, hasta_id, hastalar(ad_soyad)")
        .gte("tarih", yearStart + "T00:00:00").order("tarih", { ascending: true }).limit(500),
      supabase.from("finans").select("tip, tutar, tarih").gte("tarih", yearStart),
      supabase.from("hastalar").select("id, ad_soyad, islem, created_at")
        .order("created_at", { ascending: false }).limit(8),
      supabase.from("hastalar").select("created_at").gte("created_at", yearStart),
    ]);

    let kritikStok = 0;
    try {
      const { count } = await supabase.from("stok").select("*", { count: "exact", head: true }).lt("adet", 5);
      kritikStok = count ?? 0;
    } catch { /* table may not exist */ }

    type RR = { id: string; tarih: string; islem_turu: string|null; durum: string|null; sure_dk: number|null; hasta_id: string; hastalar: { ad_soyad: string }|null };
    type FR = { tip: string|null; tutar: number|null; tarih: string|null };
    type HR = { created_at: string|null };

    const randevular = ((randevuRaw ?? []) as unknown as RR[]).map((r) => ({
      id: r.id, tarih: r.tarih, islem_turu: r.islem_turu, durum: r.durum,
      sure_dk: r.sure_dk, hasta_id: r.hasta_id, hasta_adi: r.hastalar?.ad_soyad ?? "Bilinmiyor",
    }));
    const fi = (finansRaw ?? []) as FR[];

    setData({
      toplamHasta: toplamHasta ?? 0, odemeBekleyen: odemeBekleyen ?? 0,
      bekleyenRandevu: bekleyenRandevu ?? 0, kritikStok, randevular,
      gelirItems: fi.filter(f=>f.tip==="Gelir").map(f=>({ tarih: f.tarih??"", tutar: Number(f.tutar??0) })),
      giderItems: fi.filter(f=>f.tip==="Gider").map(f=>({ tarih: f.tarih??"", tutar: Number(f.tutar??0) })),
      hastaCreatedAt: ((hastaRaw??[]) as HR[]).map(h=>h.created_at??""),
      sonHastalar: (sonHastalarRaw??[]) as { id: string; ad_soyad: string; islem: string|null; created_at: string }[],
    });
  }, []);

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)); }, [fetchData]);

  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // ── Value helpers ─────────────────────────────────────────────────────────────
  const getRandevuCount = (r: DateRangeKey) => !data ? "—" : filterByRange(data.randevular, r).length.toString();
  const getGelir = (r: DateRangeKey) => !data ? "—" : currency(filterByRange(data.gelirItems, r).reduce((s,i)=>s+i.tutar,0));
  const getNetKar = (r: DateRangeKey) => {
    if (!data) return "—";
    const g = filterByRange(data.gelirItems, r).reduce((s,i)=>s+i.tutar,0);
    const d = filterByRange(data.giderItems, r).reduce((s,i)=>s+i.tutar,0);
    return currency(g - d);
  };
  const getYeniHasta = (r: DateRangeKey) =>
    !data ? "—" : data.hastaCreatedAt.filter(d=>d>=getStartDate(r)).length.toString();

  // ── Widget config ─────────────────────────────────────────────────────────────
  const updateDateRange = (id: string, dr: DateRangeKey) =>
    saveWidgets(widgets.map((w) => w.id === id ? { ...w, dateRange: dr } : w));
  const removeWidget = (id: string) => saveWidgets(widgets.filter((w) => w.id !== id));
  const addWidget = (type: WidgetType) => {
    const cat = getCatalog(type);
    saveWidgets([...widgets, { id: `w${Date.now()}`, type, dateRange: cat.hasDateRange ? "bu_ay" : undefined, cols: cat.defaultCols, rows: cat.defaultRows }]);
    setShowAdd(false);
  };

  // ── Layout computation ────────────────────────────────────────────────────────
  // While dragging, use previewWidgets; otherwise use widgets.
  // resizePreview temporarily overrides a widget's cols/rows.
  const effectiveWidgets = useMemo(() => {
    const base = isDragging ? previewWidgets : widgets;
    if (!resizePreview) return base;
    return base.map(w => w.id === resizePreview.id ? { ...w, cols: resizePreview.cols, rows: resizePreview.rows } : w);
  }, [isDragging, previewWidgets, widgets, resizePreview]);

  const layout = useMemo(() => computeGridLayout(effectiveWidgets, containerW), [effectiveWidgets, containerW]);

  const containerHeight = useMemo(() => {
    const vals = Object.values(layout);
    return vals.length ? Math.max(...vals.map(p => p.y + p.h)) + GAP : 300;
  }, [layout]);

  // ── Pointer drag: start ───────────────────────────────────────────────────────
  // We only initiate drag after the pointer has moved > 6px (allows clicks through)
  const pointerDownRef = useRef<{ id: string; startX: number; startY: number; startLayout: Record<string, WidgetPos> } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, widgetId: string) => {
    if (!editMode || !gridRef.current) return;
    const containerRect = gridRef.current.getBoundingClientRect();
    const cx = e.clientX - containerRect.left;
    const cy = e.clientY - containerRect.top;
    const pos = layout[widgetId];
    if (!pos) return;
    pointerDownRef.current = { id: widgetId, startX: e.clientX, startY: e.clientY, startLayout: layout };
    // Capture so we receive moves even outside the element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Store offset from widget top-left
    dragInfoRef.current = { id: widgetId, offsetX: cx - pos.x, offsetY: cy - pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const containerRect = gridRef.current.getBoundingClientRect();
    const cx = e.clientX - containerRect.left;
    const cy = e.clientY - containerRect.top;

    // Check if we should start the drag
    if (!isDragging && pointerDownRef.current) {
      const dist = Math.hypot(e.clientX - pointerDownRef.current.startX, e.clientY - pointerDownRef.current.startY);
      if (dist > 6) {
        setIsDragging(true);
        const initPreview = [...widgets];
        setPreviewWidgets(initPreview);
        previewRef.current = initPreview;
      } else return;
    }

    if (!isDragging || !dragInfoRef.current) return;
    const { id, offsetX, offsetY } = dragInfoRef.current;

    // Ghost position
    const ghostX = cx - offsetX;
    const ghostY = cy - offsetY;
    setGhostPos({ x: ghostX, y: ghostY });

    // Ghost center
    const dragged = previewRef.current.find(w => w.id === id);
    if (!dragged) return;
    const cw = containerWRef.current;
    const colW = (cw - 3 * GAP) / 4;
    const ghostW = dragged.cols * colW + (dragged.cols - 1) * GAP;
    const ghostH = dragged.rows * ROW_H + (dragged.rows - 1) * GAP;

    const ghostCX = ghostX + ghostW / 2;
    const ghostCY = ghostY + ghostH / 2;

    // Compute insert order
    const others = previewRef.current.filter(w => w.id !== id);
    const othersLayout = computeGridLayout(others, cw);
    const newPreview = computeInsertOrder(ghostCX, ghostCY, dragged, others, othersLayout);
    previewRef.current = newPreview;
    setPreviewWidgets([...newPreview]);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      saveWidgets(previewRef.current);
    }
    setIsDragging(false);
    dragInfoRef.current = null;
    pointerDownRef.current = null;
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    dragInfoRef.current = null;
    pointerDownRef.current = null;
  };

  // ── Resize ────────────────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.PointerEvent, widgetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const colW = (containerW - 3 * GAP) / 4;
    const w = widgets.find(x => x.id === widgetId);
    let preview: { cols: 1|2|4; rows: 1|2 } = { cols: w?.cols ?? 1, rows: w?.rows ?? 1 };

    const onMove = (me: PointerEvent) => {
      const relX = me.clientX - gridRect.left;
      const raw = relX / (colW + GAP);
      const newCols: 1|2|4 = raw < 1.5 ? 1 : raw < 3 ? 2 : 4;
      const wEl = document.querySelector(`[data-widget-id="${widgetId}"]`);
      const wRect = wEl?.getBoundingClientRect();
      const newRows: 1|2 = wRect && me.clientY - wRect.bottom > 60 ? 2 : 1;
      if (newCols !== preview.cols || newRows !== preview.rows) {
        preview = { cols: newCols, rows: newRows };
        setResizePreview({ id: widgetId, ...preview });
      }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setWidgets(prev => {
        const next = prev.map(x => x.id === widgetId ? { ...x, cols: preview.cols, rows: preview.rows } : x);
        localStorage.setItem("aesthecore_dashboard_v2", JSON.stringify(next));
        return next;
      });
      setResizePreview(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // ── Widget content render ─────────────────────────────────────────────────────
  const renderContent = (w: WidgetCfg, cols: number, rows: number) => {
    const cat = getCatalog(w.type);
    const dr = (w.dateRange ?? "bu_ay") as DateRangeKey;

    if (w.type === "randevu_listesi")
      return <RandevuListeWidget randevular={data?.randevular??[]} loading={loading} dateRange={dr} onDateRangeChange={d=>updateDateRange(w.id,d)} rows={rows} />;
    if (w.type === "son_hastalar")
      return <SonHastalarWidget hastalar={data?.sonHastalar??[]} loading={loading} rows={rows} />;
    if (w.type === "hizli_islemler")
      return <HizliIslemlerWidget cols={cols} />;

    let value: string | number = "—";
    let subLabel: string | undefined;
    if (data) {
      switch (w.type) {
        case "toplam_hasta":        value = data.toplamHasta; break;
        case "randevular":          value = getRandevuCount(dr); subLabel = DR_LABELS[dr]; break;
        case "gelir":               value = getGelir(dr); subLabel = DR_LABELS[dr]; break;
        case "net_kar":             value = getNetKar(dr); subLabel = DR_LABELS[dr]; break;
        case "bekleyen_randevular": value = data.bekleyenRandevu; subLabel = "Bugün bekleyen"; break;
        case "yeni_hastalar":       value = getYeniHasta(dr); subLabel = DR_LABELS[dr]; break;
        case "odeme_bekleyen":      value = data.odemeBekleyen; break;
        case "kritik_stok":         value = data.kritikStok; subLabel = data.kritikStok > 0 ? "Acil kontrol" : "Her şey yolunda"; break;
      }
    }
    return (
      <KpiCard cat={cat} value={loading ? "…" : value} subLabel={subLabel} loading={loading}
        dateRange={cat.hasDateRange ? dr : undefined}
        onDateRangeChange={cat.hasDateRange ? v=>updateDateRange(w.id,v) : undefined} />
    );
  };

  const dragId = dragInfoRef.current?.id ?? null;

  return (
    <>
      <style>{`
        @keyframes dashWiggle { 0%,100%{transform:rotate(-0.5deg)} 50%{transform:rotate(0.5deg)} }
        .dashboard-wiggle { animation: dashWiggle 0.4s ease-in-out infinite; }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      <div className={`p-6 lg:p-8 bg-slate-50 min-h-full space-y-5 ${isDragging ? "select-none" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Genel Bakış</h1>
            <p className="text-sm text-slate-400 mt-0.5">{todayStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Yenile"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl border border-slate-200 transition-colors">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
            {editMode && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                <Plus size={14} /> Widget Ekle
              </button>
            )}
            <button onClick={() => setEditMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-all ${
                editMode ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {editMode ? <><Check size={14} /> Bitti</> : <><Pencil size={14} /> Düzenle</>}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 text-sm text-blue-700">
            <AlertCircle size={14} className="shrink-0" />
            <span>Sürükle → sırala · Köşeyi çek → boyutlandır · × → kaldır</span>
          </div>
        )}

        {/* Widget container — absolute positioning for smooth drag transitions */}
        <div
          ref={gridRef}
          className="relative"
          style={{ height: containerHeight }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {effectiveWidgets.map((w) => {
            const pos = layout[w.id];
            if (!pos) return null;
            const isGhost = isDragging && w.id === dragId;
            const cols = w.cols;
            const rows = w.rows;

            return (
              <div
                key={w.id}
                data-widget-id={w.id}
                onPointerDown={(e) => handlePointerDown(e, w.id)}
                style={{
                  position: "absolute",
                  left: isGhost ? ghostPos.x : pos.x,
                  top: isGhost ? ghostPos.y : pos.y,
                  width: pos.w,
                  height: pos.h,
                  // Ghost floats above; others transition smoothly
                  zIndex: isGhost ? 50 : 1,
                  transition: isGhost ? "none" : (editMode ? "left 0.22s cubic-bezier(0.4,0,0.2,1), top 0.22s cubic-bezier(0.4,0,0.2,1)" : "left 0.22s, top 0.22s"),
                  cursor: editMode && !isGhost ? "grab" : "default",
                }}
                className={isGhost ? "" : ""}
              >
                {/* Card shell */}
                <div
                  className={`h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-150 ${
                    isGhost
                      ? "shadow-2xl scale-[1.03] opacity-90 rotate-1 ring-2 ring-blue-400"
                      : editMode
                        ? "dashboard-wiggle ring-2 ring-offset-2 ring-slate-300 hover:ring-blue-300"
                        : "hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  {renderContent(w, cols, rows)}
                </div>

                {/* Edit controls — outside shell so they don't clip */}
                {editMode && !isGhost && (
                  <>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeWidget(w.id)}
                      className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-slate-700 hover:bg-red-500 text-white rounded-full flex items-center justify-center z-30 shadow-lg transition-colors"
                    >
                      <X size={11} />
                    </button>
                    {/* Resize handle */}
                    <div
                      onPointerDown={(e) => handleResizeStart(e, w.id)}
                      title={`Boyutlandır (${cols}×${rows})`}
                      className="absolute bottom-2 right-2 z-20 cursor-se-resize flex items-center gap-1 select-none group"
                    >
                      <span className="text-[9px] font-mono text-slate-400 group-hover:text-slate-600">{cols}×{rows}</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 group-hover:text-slate-600">
                        <path d="M1 9L9 1M5 9L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {showAdd && <AddWidgetPanel widgets={widgets} onAdd={addWidget} onClose={() => setShowAdd(false)} />}
      </div>
    </>
  );
}
