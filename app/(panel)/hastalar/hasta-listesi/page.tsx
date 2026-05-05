"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Columns,
  Download,
  Trash2,
  Pencil,
  Eye,
  X,
  Phone,
  Calendar,
  Check,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

// --- TİP TANIMLAMALARI ---
type Patient = {
  id: number;
  ad_soyad: string;
  telefon: string;
  tc_kimlik: string;
  islem: string;
  durum: string;
  cinsiyet: string | null;
  dogum_tarihi: string | null;
  ulke: string | null;
  etiketler: string[] | null;
  son_randevu_tarihi: string | null;
  created_at: string;
};

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700 border-purple-200",
  Düzenli: "bg-blue-100 text-blue-700 border-blue-200",
  Eski: "bg-gray-100 text-gray-700 border-gray-200",
  Komplikasyon: "bg-red-100 text-red-700 border-red-200",
  Yabancı: "bg-orange-100 text-orange-700 border-orange-200",
  İndirimli: "bg-green-100 text-green-700 border-green-200",
};

const TAG_LIST = [
  "VIP",
  "Düzenli",
  "Eski",
  "Komplikasyon",
  "Yabancı",
  "İndirimli",
];

// --- SEKME YARDIMCI FONKSİYONLARI ---
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // End: günün sonu (23:59:59)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // ISO string olarak (Supabase için "YYYY-MM-DDTHH:MM:SS")
  return {
    gte: start.toISOString(),
    lt: end.toISOString(),
  };
}

function getThisWeekRange() {
  const now = new Date();
  // Pazartesi (haftanın ilk günü)
  const day = now.getDay();
  // Pazartesi: 1, Pazar: 0 --> Pazartesi'yi bul
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const start = new Date(monday.setHours(0, 0, 0, 0));
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 7
  );
  return {
    gte: start.toISOString(),
    lt: end.toISOString(),
  };
}

// --- YARDIMCI FONKSİYONLAR ---
function yasHesapla(dogumTarihi: string | null): number {
  if (!dogumTarihi) return -1;
  const dogum = new Date(dogumTarihi);
  const bugun = new Date();
  let yas = bugun.getFullYear() - dogum.getFullYear();
  const a = bugun.getMonth() - dogum.getMonth();
  if (a < 0 || (a === 0 && bugun.getDate() < dogum.getDate())) {
    yas--;
  }
  return yas;
}

function tarihFormatla(tarih: string | null) {
  if (!tarih) return "-";
  return new Date(tarih).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// --- TABLO SATIRI BİLEŞENİ (Memo ile, performans için) ---
type HastaSatiriProps = {
  patient: Patient;
  visibleColumns: {
    yas: boolean;
    cinsiyet: boolean;
    telefon: boolean;
    ulke: boolean;
    sonRandevu: boolean;
    etiketler: boolean;
    islem: boolean;
  };
  onRowClick: (patient: Patient) => void;
  onMoreClick: (e: any, patient: Patient) => void;
};

const HastaSatiri = memo(function HastaSatiri({
  patient,
  visibleColumns,
  onRowClick,
  onMoreClick,
}: HastaSatiriProps) {
  const yas = yasHesapla(patient.dogum_tarihi);

  return (
    <tr
      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
      onClick={() => onRowClick(patient)}
    >
      <td className="px-6 py-3">
        <div className="font-medium text-slate-900">{patient.ad_soyad}</div>
        <div className="text-xs text-slate-400 md:hidden">{patient.telefon}</div>
      </td>
      {visibleColumns.yas && (
        <td className="px-6 py-3 text-sm text-slate-600">
          {yas === -1 ? "-" : yas}
        </td>
      )}
      {visibleColumns.cinsiyet && (
        <td className="px-6 py-3 text-sm text-slate-600">
          {patient.cinsiyet || "-"}
        </td>
      )}
      {visibleColumns.telefon && (
        <td className="px-6 py-3 text-sm text-slate-600 font-mono">{patient.telefon}</td>
      )}
      {visibleColumns.ulke && (
        <td className="px-6 py-3 text-sm text-slate-600">
          {patient.ulke || "Türkiye"}
        </td>
      )}
      {visibleColumns.sonRandevu && (
        <td className="px-6 py-3">
          <span className="text-sm text-slate-600">{patient.islem || "-"}</span>
          {patient.son_randevu_tarihi && (
            <div className="text-xs text-slate-400">
              {tarihFormatla(patient.son_randevu_tarihi)}
            </div>
          )}
        </td>
      )}
      {visibleColumns.etiketler && (
        <td className="px-6 py-3">
          <div className="flex flex-wrap gap-1">
            {patient.etiketler && patient.etiketler.length > 0 ? (
              patient.etiketler.map((tag, i) => (
                <span
                  key={i}
                  className={clsx(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                    TAG_STYLES[tag] ||
                      "bg-gray-100 text-gray-600 border-gray-200"
                  )}
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-slate-300 text-xs">-</span>
            )}
          </div>
        </td>
      )}
      {visibleColumns.islem && (
        <td className="px-6 py-3 text-right">
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              onMoreClick(e, patient);
            }}
            className="action-btn p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition relative z-10"
          >
            <MoreHorizontal size={20} />
          </button>
        </td>
      )}
    </tr>
  );
});

type TabFilter = "tum" | "bugun" | "hafta";

export default function HastaListesiPage() {
  const router = useRouter();

  const [hastalar, setHastalar] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [aramaMetni, setAramaMetni] = useState("");
  const [siralama, setSiralama] = useState<{
    key: keyof Patient;
    yon: "asc" | "desc";
  }>({ key: "created_at", yon: "desc" });

  // ---- SEKME STATE ----
  const [tab, setTab] = useState<TabFilter>("tum");

  // UI Kontrolleri
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [showColumnPopover, setShowColumnPopover] = useState(false);

  // Modals & Menu
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editModalPatient, setEditModalPatient] = useState<Patient | null>(null);
  const [editModalForm, setEditModalForm] = useState<Patient | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);

  // Fixed Action Menu state
  const [actionMenu, setActionMenu] = useState<{
    id: number;
    top: number;
    left: number;
  } | null>(null);

  // Sütun gösterimi
  const [visibleColumns, setVisibleColumns] = useState({
    yas: true,
    cinsiyet: true,
    telefon: true,
    ulke: false,
    sonRandevu: true,
    etiketler: true,
    islem: true,
  });

  // Hasta Listesi Getir
  useEffect(() => {
    fetchHastalar(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function fetchHastalar(tabKey: TabFilter = "tum") {
    setLoading(true);

    let query = supabase.from("hastalar").select("*");

    if (tabKey === "bugun") {
      const { gte, lt } = getTodayRange();
      query = query.gte("created_at", gte).lt("created_at", lt);
    } else if (tabKey === "hafta") {
      const { gte, lt } = getThisWeekRange();
      query = query.gte("created_at", gte).lt("created_at", lt);
    }
    const { data, error } = await query;
    if (!error && data) setHastalar(data as Patient[]);
    setLoading(false);
  }

  // Filtreleme & Sıralama
  const filteredData = useMemo(() => {
    let data = [...hastalar];
    if (aramaMetni) {
      const lower = aramaMetni.toLowerCase();
      data = data.filter(
        (h) =>
          (h.ad_soyad?.toLowerCase() || "").includes(lower) ||
          (h.telefon || "").includes(lower) ||
          (h.etiketler || []).join(" ").toLowerCase().includes(lower)
      );
    }
    data.sort((a, b) => {
      const valA = a[siralama.key] ?? "";
      const valB = b[siralama.key] ?? "";
      if (
        siralama.key === "created_at" ||
        siralama.key === "son_randevu_tarihi"
      ) {
        return siralama.yon === "asc"
          ? new Date(valA as string).getTime() -
              new Date(valB as string).getTime()
          : new Date(valB as string).getTime() -
              new Date(valA as string).getTime();
      }
      if (valA < valB) return siralama.yon === "asc" ? -1 : 1;
      if (valA > valB) return siralama.yon === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [hastalar, aramaMetni, siralama]);

  // --- Menüyü aç: mouse pozisyonuna göre fixed render ---
  const openActionMenu = useCallback((e: any, patient: Patient) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenu({
      id: patient.id,
      top: rect.bottom + 4,
      // Menü genişliği 160px (minWidth: 160). left'i ona göre geri çek.
      left: rect.left + window.scrollX - 160,
    });
  }, []);

  // --- Sil Modalı onay ---
  const handleDeleteHasta = async (id: number) => {
    setLoading(true);
    const { error } = await supabase.from("hastalar").delete().eq("id", id);
    if (!error)
      setHastalar((prev) =>
        prev.filter((h) => h.id !== id)
      );
    setLoading(false);
    setDeleteModalId(null);
    setActionMenu(null);
  };

  // --- Düzenle Modalı submit ---
  const handleEditModalOpen = (hasta: Patient) => {
    setEditModalPatient(hasta);
    setEditModalForm({ ...hasta }); // Formu izole tut
  };

  const handleEditFormChange = (field: keyof Patient, value: any) => {
    setEditModalForm((prev: any) =>
      prev ? { ...prev, [field]: value } : prev
    );
  };

  const handleToggleEtiket = (etiket: string) => {
    setEditModalForm((prev: any) => {
      if (!prev) return prev;
      const prevTags: string[] = prev.etiketler || [];
      const nextTags = prevTags.includes(etiket)
        ? prevTags.filter((e) => e !== etiket)
        : [...prevTags, etiket];
      return { ...prev, etiketler: nextTags };
    });
  };

  const handleEditSave = async () => {
    if (!editModalForm || !editModalForm.id) return;
    setLoading(true);
    // Sadece güncellenecek alanları göndermek için destructure yazabilirsin:
    const { id, ...fields } = editModalForm;
    const { error, data } = await supabase
      .from("hastalar")
      .update({ ...fields })
      .eq("id", id)
      .select();
    if (!error && data && data[0]) {
      setHastalar((prev) =>
        prev.map((h) => (h.id === id ? data[0] : h))
      );
      setEditModalPatient(null);
      setEditModalForm(null);
    }
    setLoading(false);
  };

  // --- Hızlı Bakış Modalı (detay) aç ---
  const handleQuickView = (hasta: Patient) => {
    setSelectedPatient(hasta);
  };

  // --- Table Column Labels (for türkiye-uygun, UX için) ---
  const COL_LABELS: Record<string, string> = {
    yas: "YAŞ",
    cinsiyet: "CİNSİYET",
    telefon: "TELEFON",
    ulke: "ÜLKE",
    sonRandevu: "SON İŞLEM",
    etiketler: "ETİKETLER",
    islem: "İŞLEM",
  };

  // --- SEKME TANIMLARI ---
  const TAB_OPTIONS = [
    {
      key: "tum",
      label: "Tümü",
      icon: ListFilter,
    },
    {
      key: "bugun",
      label: "Bugün Eklenenler",
      icon: Calendar,
    },
    {
      key: "hafta",
      label: "Bu Hafta",
      icon: Calendar,
    },
  ];

  function ListFilter(props: any) {
    // Takma ikon (lucide'de ListFilter yoksa fallback)
    return (
      <svg width={18} height={18} className="inline -mt-0.5 mr-1" viewBox="0 0 20 20" {...props} fill="none" stroke="currentColor">
        <rect x="3" y="5.5" width="14" height="2" rx="1" fill="currentColor" />
        <rect x="5" y="9.5" width="10" height="2" rx="1" fill="currentColor" />
        <rect x="7" y="13.5" width="6" height="2" rx="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Hasta Listesi
          </h1>
          <p className="text-slate-500 text-sm">
            Toplam {filteredData.length} kayıt listeleniyor.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <Download size={16} />{" "}
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>
          <button
            onClick={() => router.push("/hastalar/yeni-hasta")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-200"
          >
            <Plus size={18} /> Yeni Hasta
          </button>
        </div>
      </div>

      {/* SEKME BAR */}
      <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center mb-4 gap-1 shadow-sm relative z-10">
        {TAB_OPTIONS.map((tabOpt, idx) => (
          <button
            key={tabOpt.key}
            onClick={() => setTab(tabOpt.key as TabFilter)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition min-w-[130px]",
              tab === tabOpt.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-blue-700 hover:bg-white/80"
            )}
          >
            <tabOpt.icon size={18} strokeWidth={tab === tabOpt.key ? 2.2 : 1.8} />
            {tabOpt.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="flex items-center rounded-lg gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-white/90 transition"
          onClick={() =>
            alert("Tarih aralığı seçici yakında eklenecek.")
          }
        >
          <Calendar size={18} />
          <span className="font-semibold">Tarih Seç</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative">
        {/* TOOLBAR */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Ad soyad, telefon veya etiket ara..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowSortPopover((s) => !s)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <ArrowUpDown size={18} />
            </button>
            {showSortPopover && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSortPopover(false)}
                />
                <div className="absolute right-20 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-40 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-semibold text-slate-400 px-3 py-2">
                    SIRALAMA
                  </div>
                  <button
                    onClick={() => {
                      setSiralama({ key: "created_at", yon: "desc" });
                      setShowSortPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    En Yeniler
                  </button>
                  <button
                    onClick={() => {
                      setSiralama({ key: "ad_soyad", yon: "asc" });
                      setShowSortPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    İsim (A-Z)
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setShowFilterPopover((f) => !f)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <Filter size={18} />
            </button>
            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div className="absolute right-10 top-12 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-40 animate-in fade-in zoom-in-95">
                  <h3 className="font-semibold mb-2">Filtrele</h3>
                  <p className="text-xs text-slate-500">
                    Detaylı filtreleme yakında...
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => setShowColumnPopover((c) => !c)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <Columns size={18} />
            </button>
            {showColumnPopover && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowColumnPopover(false)}
                />
                <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-40 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-semibold text-slate-400 px-2 mb-2">
                    SÜTUNLAR
                  </div>
                  {Object.keys(visibleColumns).map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          visibleColumns[
                            col as keyof typeof visibleColumns
                          ]
                        }
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col]: !prev[
                              col as keyof typeof visibleColumns
                            ],
                          }))
                        }
                      />
                      <span className="text-sm capitalize">
                        {COL_LABELS[col] || col}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* TABLO */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-3">AD SOYAD</th>
                {visibleColumns.yas && <th className="px-6 py-3">YAŞ</th>}
                {visibleColumns.cinsiyet && <th className="px-6 py-3">CİNSİYET</th>}
                {visibleColumns.telefon && <th className="px-6 py-3">TELEFON</th>}
                {visibleColumns.ulke && <th className="px-6 py-3">ÜLKE</th>}
                {visibleColumns.sonRandevu && (
                  <th className="px-6 py-3">SON İŞLEM</th>
                )}
                {visibleColumns.etiketler && <th className="px-6 py-3">ETİKETLER</th>}
                {visibleColumns.islem && (
                  <th className="px-6 py-3 text-right">İŞLEM</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredData.map((patient) => (
                  <HastaSatiri
                    key={patient.id}
                    patient={patient}
                    visibleColumns={visibleColumns}
                    onRowClick={handleQuickView}
                    onMoreClick={openActionMenu}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FIXED ACTION MENU (EN ÜST KATMAN) --- */}
      {actionMenu && (
        <>
          <div
            className="fixed inset-0 z-[9998] cursor-default"
            onClick={() => setActionMenu(null)}
          />
          <div
            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] py-1 w-40 animate-in fade-in zoom-in-95"
            style={{
              top: actionMenu.top,
              left: actionMenu.left,
              minWidth: 160,
            }}
          >
            <button
              onClick={() => {
                router.push(`/hastalar/hasta-listesi/${actionMenu.id}`);
                setActionMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Eye size={14} /> Detaylı Bakış
            </button>
            <button
              onClick={() => {
                const hasta = hastalar.find((h) => h.id === actionMenu.id);
                if (hasta) handleEditModalOpen(hasta);
                setActionMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Pencil size={14} /> Düzenle
            </button>
            <div className="border-t border-slate-100 my-1"></div>
            <button
              onClick={() => {
                setDeleteModalId(actionMenu.id);
                setActionMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} /> Sil
            </button>
          </div>
        </>
      )}

      {/* --- DÜZENLE MODALI (editModalPatient) --- */}
      {editModalPatient && editModalForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 relative z-[10001]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
                  {editModalForm.ad_soyad?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editModalForm.ad_soyad}
                  </h2>
                  <p className="text-sm text-slate-500">
                    ID: #{editModalForm.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditModalPatient(null);
                  setEditModalForm(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleEditSave();
                }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-400">
                    Ad Soyad
                  </label>
                  <input
                    value={editModalForm.ad_soyad}
                    onChange={(e) =>
                      handleEditFormChange("ad_soyad", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-400">Telefon</label>
                  <input
                    value={editModalForm.telefon}
                    onChange={(e) => handleEditFormChange("telefon", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-400">Cinsiyet</label>
                  <select
                    value={editModalForm.cinsiyet || ""}
                    onChange={(e) =>
                      handleEditFormChange("cinsiyet", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">-</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Erkek">Erkek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-400">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={editModalForm.dogum_tarihi || ""}
                    onChange={(e) =>
                      handleEditFormChange("dogum_tarihi", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-400">Etiketler</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TAG_LIST.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={clsx(
                          "px-3 py-1 rounded text-xs font-medium border transition select-none",
                          (editModalForm.etiketler || []).includes(tag)
                            ? TAG_STYLES[tag] + " ring-2 ring-blue-200"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-slate-100"
                        )}
                        onClick={() => handleToggleEtiket(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalPatient(null);
                      setEditModalForm(null);
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    disabled={loading}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-blue-200 shadow-sm"
                    disabled={loading}
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SİLME/ONAY MODALI (deleteModalId) --- */}
      {deleteModalId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 relative z-[11001]">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                  <Trash2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Hastayı Sil
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Bu hastayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteModalId(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  disabled={loading}
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleDeleteHasta(deleteModalId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  disabled={loading}
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HIZLI BAKIŞ MODALI --- */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 relative z-[10001]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
                  {selectedPatient.ad_soyad.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedPatient.ad_soyad}
                  </h2>
                  <p className="text-sm text-slate-500">
                    ID: #{selectedPatient.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Telefon</p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedPatient.telefon}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <Check size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Son İşlem</p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedPatient.islem}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Kayıt Tarihi</p>
                  <p className="text-sm font-medium text-slate-700">
                    {tarihFormatla(selectedPatient.created_at)}
                  </p>
                </div>
              </div>
              {/* Etiketleri Hızlı Bakışta Göster */}
              {selectedPatient.etiketler &&
                selectedPatient.etiketler.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                      <Tag size={16} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPatient.etiketler.map((t) => (
                        <span
                          key={t}
                          className={clsx(
                            "text-xs border px-2 py-0.5 rounded",
                            TAG_STYLES[t] || "bg-slate-100 border-slate-200 text-slate-700"
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Kapat
              </button>
              <button
                onClick={() =>
                  router.push(`/hastalar/hasta-listesi/${selectedPatient.id}`)
                }
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Detaylı Dosyayı Aç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}