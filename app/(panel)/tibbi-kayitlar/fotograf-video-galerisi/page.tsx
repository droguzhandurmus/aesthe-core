"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Image as IconImage,
  Upload as IconUpload,
  Trash2 as IconTrash2,
  User as IconUser,
  Calendar as IconCalendar,
  Video as IconVideo,
  Search as IconSearch,
  AlertCircle,
  X as IconX,
  ChevronDown as IconChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { differenceInDays, differenceInMonths, format } from "date-fns";

////////////////////////////////////////////////////////////////////////////////
// TYPELER

type Patient = {
  id: string;
  ad: string;
  soyad: string;
};

type MediaType = "image" | "video";
type MediaCategory = "Ameliyat" | "Klinik İşlem";

type Media = {
  id: string;
  hasta_id: string;
  url: string;
  type: MediaType;
  kategori: MediaCategory;
  tags: string[];
  aciklama?: string | null;
  created_at: string;
  hasta?: Patient;
  notlar?: {
    islem_tarihi: string;
    cekim_tarihi: string;
    asama: "Öncesi" | "Sonrası";
    zaman_etiketi?: string;
    notlar?: string;
  };
};

type Appointment = {
  id: string;
  hasta_id: string;
  baslangic_tarihi: string;
  tur?: string | null;
};

const AMELIYAT_OPTIONS = [
  "Rinoplasti",
  "Meme Estetiği",
  "Liposuction",
  "Göz Kapağı",
  "Karın Germe",
  "Yüz Germe"
];
const KLINIK_OPTIONS = [
  "Botoks",
  "Dolgu",
  "Mezoterapi",
  "Gençlik Aşısı",
  "PRP",
  "Cilt Bakımı"
];
const MEDIA_TYPE_OPTIONS: { label: string; value: "all" | MediaType }[] = [
  { label: "Tümü", value: "all" },
  { label: "Fotoğraf", value: "image" },
  { label: "Video", value: "video" },
];

////////////////////////////////////////////////////////////////////////////////
// BASIT TOAST/ALERT

function showToast(msg: string, type: "error" | "success" = "success") {
  window.clearTimeout((window as any)._medya_toast_timer);
  const toast = document.getElementById("_medya_toast");
  if (toast) {
    toast.textContent = msg;
    toast.className =
      "fixed z-[1000] left-1/2 top-6 -translate-x-1/2 px-4 py-2 rounded shadow font-semibold text-white transition bg-" +
      (type === "error" ? "[#ef4444]" : "[#4A6E95]");
    toast.style.opacity = "1";
    (window as any)._medya_toast_timer = setTimeout(() => {
      if (toast) toast.style.opacity = "0";
    }, 2200);
  }
}

////////////////////////////////////////////////////////////////////////////////
// MODAL

function Modal({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Modal kapat arka"
      />
      <div className="relative z-10 bg-white rounded-xl shadow-lg w-full max-w-xl p-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ARAMALI İŞLEM (FILTER) DROPDOWN COMPONENT - Sol panelde filtre için kullanılır
// -----------------------------------------------------------------------------
function IslemAramaCombo({
  kategori,             // null | "Ameliyat" | "Klinik İşlem"
  value,
  onChange,
  disabled = false,
  placeholder = "İşlem seç...",
} : {
  kategori: MediaCategory | null;
  value: string[];
  onChange: (val: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Options, kategoriye göre belirle (kat. null ise "Hepsi"!)
  const fullOptions = useMemo(() => {
    if (kategori === "Ameliyat") return [...AMELIYAT_OPTIONS];
    if (kategori === "Klinik İşlem") return [...KLINIK_OPTIONS];
    // Hepsi
    return [...AMELIYAT_OPTIONS, ...KLINIK_OPTIONS].sort((a, b) =>
      a.localeCompare(b, "tr")
    );
  }, [kategori]);

  // Filtreleme
  const filtered = useMemo(() => {
    const qtr = q.trim().toLocaleLowerCase("tr");
    if (!qtr) return fullOptions;
    return fullOptions.filter(opt =>
      opt.toLocaleLowerCase("tr").includes(qtr)
    );
  }, [q, fullOptions]);

  // Dışarı tıklayınca dropdown'ı kapat
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Klavyeden ESC ile kapat
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Seçim
  const isChecked = (opt: string) => value.includes(opt);

  function handleCheck(opt: string) {
    if (isChecked(opt)) {
      onChange(value.filter(x => x !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  function handleClear() {
    onChange([]);
    setQ("");
    inputRef.current?.focus();
  }

  const showClear = value.length > 0;

  // Etiket renderı
  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        className={
          `flex items-center border rounded px-3 py-2 bg-white ${disabled ? "opacity-60" : "cursor-pointer"} shadow-sm`
        }
        onClick={() => { if(!disabled) setOpen(true); }}
        tabIndex={-1}
        style={{ minHeight: 44 }}
      >
        <IconSearch className="w-4 h-4 text-slate-400 mr-2" />
        <input
          ref={inputRef}
          className="border-0 outline-none flex-1 bg-transparent text-sm"
          style={{ minWidth: 0 }}
          placeholder={placeholder}
          disabled={disabled}
          value={open ? q : value.length > 0 ? value.join(', ') : ""}
          onChange={e => setQ(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
        />
        {showClear ? (
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label="Temizle"
            onClick={e => { e.stopPropagation(); handleClear(); }}
            disabled={disabled}
          >
            <IconX className="w-4 h-4" />
          </button>
        ) : (
          <IconChevronDown className="w-4 h-4 text-slate-400 ml-1" />
        )}
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 z-50 bg-white border mt-1 rounded shadow-lg max-h-60 overflow-y-auto animate-fadein"
        >
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-sm">
              Sonuç yok
            </div>
          ) : (
            filtered.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={isChecked(opt)}
                  onChange={() => handleCheck(opt)}
                  tabIndex={-1}
                  disabled={disabled}
                />
                <span>{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// HASTA ARAMA DROPBOX

function PatientSearchCombo({
  value,
  onChange,
  options,
  disabled,
  loading,
  placeholder = "Hasta ara..."
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: Patient[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qtr = q.trim().toLocaleLowerCase("tr");
    if (!qtr) return options;
    return options.filter(
      h =>
        h.ad.toLocaleLowerCase("tr").includes(qtr) ||
        h.soyad.toLocaleLowerCase("tr").includes(qtr) ||
        `${h.ad} ${h.soyad}`.toLocaleLowerCase("tr").includes(qtr)
    );
  }, [q, options]);
  const selected = options.find((x) => x.id === value);
  return (
    <div className="relative w-full">
      <div
        className={`flex items-center border rounded px-3 py-2 bg-white ${disabled ? "opacity-60" : "cursor-pointer"} shadow-sm`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        tabIndex={-1}
      >
        <IconUser className="w-4 h-4 text-slate-400 mr-2" />
        <input
          className="border-0 outline-none flex-1 bg-transparent text-sm"
          placeholder={placeholder}
          value={open ? q : selected ? `${selected.ad} ${selected.soyad}` : ""}
          onChange={e => setQ(e.target.value)}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          style={{ minWidth: 0 }}
        />
        {selected && (
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation();
              setQ("");
              onChange(null);
            }}
            disabled={disabled}
            aria-label="Temizle"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 max-h-60 overflow-y-auto mt-1 rounded shadow bg-white border animate-fadein">
          {loading ? (
            <div className="py-4 text-center text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-gray-400">Hasta bulunamadı</div>
          ) : (
            filtered.map((h) => (
              <div
                key={h.id}
                className={`px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer text-slate-800 ${
                  value === h.id ? "bg-blue-100 font-semibold" : ""
                }`}
                onClick={() => {
                  onChange(h.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                {h.ad} {h.soyad}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// ZAMAN FARKI LABELI HESAPLAMA

function calculateTimeDiff(islemTarihi: string, cekimTarihi: string, asama: "Öncesi" | "Sonrası"): string | null {
  if (!islemTarihi || !cekimTarihi) return null;
  const t1 = new Date(islemTarihi);
  const t2 = new Date(cekimTarihi);
  if (isNaN(t1.getTime()) || isNaN(t2.getTime())) return null;

  const diffDays = differenceInDays(t2, t1);
  if (asama === "Öncesi") {
    if (diffDays < 0)
      return `İşlemden Önce ${Math.abs(diffDays)} Gün`;
    return `Pre-op`;
  }
  // Sonrası (post-op)
  if (diffDays < 0) return "Hatalı Tarih";
  if (diffDays === 0) return "Post-op Gün";
  if (diffDays < 30) return `Post-op ${diffDays}. Gün`;
  const diffMonths = differenceInMonths(t2, t1);
  if (diffMonths < 2) {
    return `Post-op ${diffMonths + 1}. Ay`;
  }
  // örn: 2 ay + 6 gün
  const kaldays = differenceInDays(t2, new Date(t1.getFullYear(), t1.getMonth() + diffMonths, t1.getDate()));
  return `Post-op ${diffMonths + 1}. Ay${kaldays > 0 ? " +" + kaldays + "g" : ""}`;
}

////////////////////////////////////////////////////////////////////////////////
// MAIN COMPONENT 

export default function MedyaGalerisiPage() {
  // -----------------------------
  // STATE
  // -----------------------------
  // Medya ve Hasta Kayıtları
  const [media, setMedia] = useState<Media[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtreler
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  // MediaCategory | null ("Ameliyat", "Klinik İşlem", null = Hepsi)
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | null>(null);

  // İşlem filtresi, çoklu seçim:
  const [selectedIslemTags, setSelectedIslemTags] = useState<string[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<"all" | MediaType>("all");

  // MODAL ve Form State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // FormData objesi: hasta_id, hasta_ad, islem_tarihi, cekim_tarihi, asama, notlar
  const [formData, setFormData] = useState<{
    hasta_id: string | null;
    hasta_ad: string | null;
    islem_tarihi: string; // yyyy-MM-dd
    cekim_tarihi: string; // yyyy-MM-dd
    asama: "Öncesi" | "Sonrası";
    notlar: string;
    kategori: MediaCategory | null;
    tags: string[];
  }>({
    hasta_id: null,
    hasta_ad: null,
    islem_tarihi: "",
    cekim_tarihi: format(new Date(), "yyyy-MM-dd"),
    asama: "Sonrası",
    notlar: "",
    kategori: null,
    tags: [],
  });

  // Akıllı Asistan: Seçili hastanın son randevusu (appointment)
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  // Galeri Lightbox görüntüleme
  const [imageModal, setImageModal] = useState<{ open: boolean; media?: Media }>({ open: false, media: undefined });

  // -----------------------------
  // DATA FETCH
  // -----------------------------
  async function fetchData() {
    setLoading(true);
    const [hastaRes, mediaRes] = await Promise.all([
      supabase.from("hasta").select("*").order("ad", { ascending: true }),
      supabase
        .from("medya_galerisi")
        .select("*, hasta:hasta_id(id, ad, soyad)")
        .order("created_at", { ascending: false }),
    ]);
    setPatients(hastaRes.data || []);
    setMedia(
      (mediaRes.data || []).map((x) => ({
        ...x,
        tags: x.tags ?? [],
        notlar: (() => {
          try {
            if (typeof x.aciklama === "string" && x.aciklama.trim().startsWith("{"))
              return JSON.parse(x.aciklama);
          } catch {}
          return undefined;
        })(),
      }))
    );
    setLoading(false);
  }
  useEffect(() => {
    fetchData();
  }, []);

  // Seçili hasta değiştiğinde lastAppointment otomatik gelsin
  useEffect(() => {
    if (formData.hasta_id) fetchLastAppointment(formData.hasta_id);
    else setLastAppointment(null);
  }, [formData.hasta_id]);

  async function fetchLastAppointment(patientId: string) {
    setAppointmentLoading(true);
    const { data, error } = await supabase
      .from("randevular")
      .select("id,hasta_id,baslangic_tarihi,tur")
      .eq("hasta_id", patientId)
      .order("baslangic_tarihi", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && !error) {
      setLastAppointment(data as Appointment);
    } else {
      setLastAppointment(null);
    }
    setAppointmentLoading(false);
  }

  // FİLTRELİ MEDIA
  const filteredMedia = useMemo(() => {
    let data = [...media];
    if (selectedPatientId) {
      data = data.filter((x) => x.hasta_id === selectedPatientId);
    }
    if (selectedCategory) {
      data = data.filter((x) => x.kategori === selectedCategory);
    }
    if (selectedIslemTags.length > 0) {
      data = data.filter((x) =>
        x.tags?.some((tag) => selectedIslemTags.includes(tag))
      );
    }
    if (selectedMediaType !== "all") {
      data = data.filter((x) => x.type === selectedMediaType);
    }
    return data;
  }, [media, selectedPatientId, selectedCategory, selectedIslemTags, selectedMediaType]);

  // -----------------------------
  // UPLOAD LOGIC (AYNI)
  // -----------------------------
  async function handleUpload() {
    if (
      !formData.hasta_id ||
      !formData.islem_tarihi ||
      !formData.cekim_tarihi ||
      !formData.kategori ||
      formData.tags.length === 0 ||
      uploadFiles.length === 0
    ) {
      showToast("Lütfen tüm alanları doldurun.", "error");
      return;
    }
    setUploading(true);
    let err = false;
    for (let file of uploadFiles) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const mediaType: MediaType = file.type.startsWith("image/") ? "image" : "video";
      const filename = `${formData.hasta_id}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("galeri")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        showToast(`Yüklenemedi: ${file.name}`, "error");
        err = true;
        continue;
      }
      const { data: urlObj } = supabase.storage.from("galeri").getPublicUrl(filename);

      const zaman_etiketi = calculateTimeDiff(
        formData.islem_tarihi,
        formData.cekim_tarihi,
        formData.asama
      );
      const tags = [...formData.tags, zaman_etiketi || ""].filter(Boolean);

      const notlarObj = {
        islem_tarihi: formData.islem_tarihi,
        cekim_tarihi: formData.cekim_tarihi,
        asama: formData.asama,
        zaman_etiketi,
        notlar: formData.notlar,
      };
      const { error: dbErr } = await supabase.from("medya_galerisi").insert({
        url: urlObj?.publicUrl,
        type: mediaType,
        hasta_id: formData.hasta_id,
        kategori: formData.kategori,
        tags,
        aciklama: JSON.stringify(notlarObj),
      });
      if (dbErr) {
        showToast("Veritabanı hatası: " + dbErr.message, "error");
        err = true;
      }
    }
    setUploading(false);
    setUploadFiles([]);
    setUploadModalOpen(false);
    resetForm();
    fetchData();
    showToast(err ? "Bazı medya kaydedilemedi." : "Medya yüklendi!", err ? "error" : "success");
  }

  function resetForm() {
    setFormData({
      hasta_id: null,
      hasta_ad: null,
      islem_tarihi: "",
      cekim_tarihi: format(new Date(), "yyyy-MM-dd"),
      asama: "Sonrası",
      notlar: "",
      kategori: null,
      tags: [],
    });
    setUploadFiles([]);
    setLastAppointment(null);
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setUploadFiles(files);
  }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setUploadFiles(files);
  }

  async function handleDelete(media: Media) {
    if (!confirm("Bu medyayı silmek istiyor musunuz?")) return;
    const filename = media.url.split("/").pop()!;
    await supabase.storage.from("galeri").remove([filename]);
    await supabase.from("medya_galerisi").delete().eq("id", media.id);
    setMedia((prev) => prev.filter((x) => x.id !== media.id));
    showToast("Silindi!", "success");
  }

  // -----------------------------
  // UI
  // -----------------------------
  const currentTimeDiff =
    formData.islem_tarihi && formData.cekim_tarihi
      ? calculateTimeDiff(formData.islem_tarihi, formData.cekim_tarihi, formData.asama)
      : null;

  return (
    <>
      <div
        id="_medya_toast"
        style={{
          opacity: 0,
          pointerEvents: "none"
        }}
        className="fixed z-[1000] left-1/2 top-6 -translate-x-1/2 px-4 py-2 rounded shadow font-semibold text-white transition"
      />
      <div className="flex min-h-screen bg-white">
        {/* --------------- SOL PANEL (Filtreler) -------------- */}
        <aside className="w-full sm:w-72 md:w-80 px-6 py-9 border-r border-slate-200 flex-shrink-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 sticky top-0 h-screen overflow-y-auto z-[40]">
          <h2 className="text-2xl font-bold mb-4 text-[#4A6E95] flex items-center gap-2">
            <IconImage className="mr-2" /> Fotoğraf & Video Galerisi
          </h2>
          <div className="mb-5">
            <label className="block mb-1 font-medium">Hasta Seçimi</label>
            <PatientSearchCombo
              value={selectedPatientId}
              onChange={id => setSelectedPatientId(id)}
              options={patients}
              disabled={loading}
              loading={loading}
              placeholder="Hasta arayın..."
            />
          </div>
          <div className="mb-5">
            <label className="block mb-1 font-medium">İşlem Türü</label>
            <div className="flex gap-3 mb-2">
              <label>
                <input
                  type="radio"
                  name="kategori"
                  checked={selectedCategory === "Ameliyat"}
                  onChange={() => { setSelectedCategory("Ameliyat"); setSelectedIslemTags([]); }}
                  className="accent-blue-600 mr-1"
                />
                Ameliyat
              </label>
              <label>
                <input
                  type="radio"
                  name="kategori"
                  checked={selectedCategory === "Klinik İşlem"}
                  onChange={() => { setSelectedCategory("Klinik İşlem"); setSelectedIslemTags([]); }}
                  className="accent-green-600 mr-1"
                />
                Klinik İşlem
              </label>
              <label>
                <input
                  type="radio"
                  name="kategori"
                  checked={selectedCategory === null}
                  onChange={() => { setSelectedCategory(null); setSelectedIslemTags([]); }}
                  className="accent-slate-400 mr-1"
                />
                Hepsi
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <IslemAramaCombo
                kategori={selectedCategory}
                value={selectedIslemTags}
                onChange={setSelectedIslemTags}
                disabled={selectedCategory === null && false}
                placeholder={
                  selectedCategory === "Ameliyat"
                    ? "Ameliyat yazıp seçin..."
                    : selectedCategory === "Klinik İşlem"
                    ? "Klinik işlem yazıp seçin..."
                    : "İşlem yazıp seçin..."
                }
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="block mb-1 font-medium">Medya Tipi</label>
            <div className="flex gap-2 flex-wrap">
              {MEDIA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`rounded px-3 py-1 text-sm font-semibold transition ${
                    selectedMediaType === opt.value
                      ? "bg-[#4A6E95] text-white shadow"
                      : "bg-slate-100 text-[#4A6E95] hover:bg-blue-50"
                  }`}
                  onClick={() => setSelectedMediaType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
        {/* --------------- SAĞ PANEL (Galeri) -------------- */}
        <main className="flex-1 flex flex-col px-2 md:px-10 py-10 min-w-0">
          <div className="flex items-center justify-end mb-7">
            <button
              className="flex gap-2 items-center rounded-md shadow px-5 py-2 font-semibold text-md bg-[#4A6E95] text-white hover:bg-[#3A5878]"
              onClick={() => setUploadModalOpen(true)}
            >
              <IconUpload className="w-5 h-5" /> + Medya Yükle
            </button>
          </div>
          {/* Galeri - saf CSS "masonry" */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
            <div className="columns-1 md:columns-3 gap-4">
              {filteredMedia.length === 0 && (
                <p className="text-center text-gray-300 text-lg font-medium py-8 flex items-center gap-2 justify-center">
                  <AlertCircle className="w-6 h-6" />
                  Medya bulunamadı
                </p>
              )}
              {filteredMedia.map((m) => {
                const not = m.notlar;
                return (
                  <div
                    key={m.id}
                    className="break-inside-avoid mb-6 relative rounded-lg group bg-[#f8fbfd] border border-[#e3edf7] shadow-sm cursor-pointer p-3 transition"
                    tabIndex={0}
                    onClick={() => setImageModal({ open: true, media: m })}
                  >
                    {/* Sol üst: Hasta */}
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                      {not?.asama && (
                        <span className={
                          not.asama === "Sonrası"
                            ? "px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-white"
                            : "px-2 py-0.5 rounded text-xs font-bold bg-blue-500 text-white"
                        }>
                          {not.asama}
                        </span>
                      )}
                    </div>
                    {/* Sağ üst: zaman etiketi */}
                    <div className="absolute top-2 right-2 z-20 flex gap-2 items-center">
                      {(not && not.zaman_etiketi) && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold text-xs border border-gray-200 shadow">
                          {not.zaman_etiketi}
                        </span>
                      )}
                      <button
                        className="bg-white border border-gray-300 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        onClick={e => { e.stopPropagation(); handleDelete(m); }}
                        title="Sil"
                      >
                        <IconTrash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    {/* Ana Medya */}
                    <div className="flex items-center justify-center bg-white rounded mb-2 overflow-hidden">
                      {m.type === "image" ? (
                        <img
                          src={m.url}
                          alt={not?.notlar || ""}
                          className="object-cover w-full"
                          style={{ borderRadius: "0.5rem", maxHeight: "260px" }}
                        />
                      ) : (
                        <video
                          src={m.url}
                          controls
                          className="object-cover w-full"
                          style={{ borderRadius: "0.5rem", maxHeight: "260px" }}
                        />
                      )}
                    </div>
                    {/* Bilgi */}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-sm text-[#4A6E95] font-semibold">
                          {m.hasta?.ad} {m.hasta?.soyad}
                        </span>
                        <span className="ml-2 text-xs rounded px-2 py-0.5 bg-blue-100 text-blue-900">{m.kategori}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.tags?.map((t, idx) => (
                            <span key={t + idx} className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {m.type === "image" ? <IconImage className="w-4 h-4" /> : <IconVideo className="w-4 h-4" />}
                        {m.type === "image" ? "Fotoğraf" : "Video"}
                      </span>
                    </div>
                    {not?.notlar && (
                      <div className="text-xs text-gray-700 mt-1">{not.notlar}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        {/* --------------- MODAL: Medya Yükle (Gelişmiş) -------------- */}
        <Modal open={uploadModalOpen} onClose={() => { setUploadModalOpen(false); resetForm(); }}>
          <form
            className="w-full p-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (!uploading) handleUpload();
            }}
          >
            {/* Başlık & kapat */}
            <div className="flex items-center mb-2">
              <IconUpload className="text-[#4A6E95] mr-2" />
              <div className="font-semibold text-2xl flex-1">Medya Yükle</div>
              <button
                onClick={() => { setUploadModalOpen(false); resetForm(); }}
                className="ml-2 p-1 rounded-full focus:outline-none"
                type="button"
                aria-label="Kapat"
              >
                <IconX />
              </button>
            </div>
            {/* Dosya */}
            <div
              className={`flex flex-col justify-center items-center w-full h-40 mb-5 border-2 border-dashed rounded-lg transition-colors ${
                uploadFiles.length ? "border-blue-400 bg-blue-50" : "border-blue-200 bg-white"
              } ${uploading ? "opacity-70 pointer-events-none" : ""}`}
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {uploadFiles.length === 0 ? (
                <>
                  <IconUpload className="w-10 h-10 text-[#4A6E95] mb-1" />
                  <span className="text-gray-500 mb-1 text-center text-base">
                    Sürükleyip medya dosyalarını bırakın
                  </span>
                  <label className="cursor-pointer text-[#4A6E95] hover:underline font-semibold">
                    veya tıklayarak dosya seç
                    <input
                      className="sr-only"
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      disabled={uploading}
                      onChange={handleFileSelect}
                    />
                  </label>
                </>
              ) : (
                <div className="flex gap-2 flex-wrap items-center">
                  {uploadFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center text-xs gap-1 px-2 py-1 rounded bg-[#f1f6fb] shadow"
                    >
                      {file.type.startsWith("image/") ? (
                        <IconImage className="w-4 h-4" />
                      ) : (
                        <IconVideo className="w-4 h-4" />
                      )}
                      {file.name}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="ml-2 text-xs px-2 text-[#4A6E95] underline"
                    onClick={() => setUploadFiles([])}
                    disabled={uploading}
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>
            {/* Hasta */}
            <div className="mb-4">
              <label className="mb-1 block font-medium">Hasta</label>
              <PatientSearchCombo
                value={formData.hasta_id}
                onChange={id => {
                  setFormData(fd => ({
                    ...fd,
                    hasta_id: id,
                    hasta_ad: patients.find(p => p.id === id)?.ad || null
                  }));
                }}
                options={patients}
                disabled={uploading}
              />
              {formData.hasta_id && (
                <div className="mt-1 text-xs">
                  {appointmentLoading ? (
                    <span className="text-gray-400 italic">Son işlem aranıyor...</span>
                  ) : lastAppointment ? (
                    <span
                      className="text-[#4A6E95] underline cursor-pointer"
                      title="Son işlemin tarihini uygula"
                      onClick={() =>
                        setFormData(fd => ({
                          ...fd,
                          islem_tarihi: format(new Date(lastAppointment.baslangic_tarihi), "yyyy-MM-dd")
                        }))
                      }
                    >
                      Son İşlem: {lastAppointment.tur || "N/A"} (
                      {format(new Date(lastAppointment.baslangic_tarihi), "dd.MM.yyyy")}
                      )
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Son işlem kaydı yok.</span>
                  )}
                </div>
              )}
            </div>
            {/* İşlem türü */}
            <div className="mb-4">
              <label className="mb-1 block font-medium">İşlem Türü</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="modal-kategori"
                    checked={formData.kategori === "Ameliyat"}
                    onChange={() =>
                      setFormData(fd => ({
                        ...fd,
                        kategori: "Ameliyat",
                        tags: []
                      }))
                    }
                    disabled={uploading}
                  />
                  <span>Ameliyat</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="modal-kategori"
                    checked={formData.kategori === "Klinik İşlem"}
                    onChange={() =>
                      setFormData(fd => ({
                        ...fd,
                        kategori: "Klinik İşlem",
                        tags: []
                      }))
                    }
                    disabled={uploading}
                  />
                  <span>Klinik İşlem</span>
                </label>
              </div>
              {formData.kategori && (
                <div className="mt-2">
                  <IslemAramaCombo
                    kategori={formData.kategori}
                    value={formData.tags}
                    onChange={arr => setFormData((fd) => ({ ...fd, tags: arr }))}
                    disabled={uploading}
                    placeholder={
                      formData.kategori === "Ameliyat"
                        ? "Ameliyat yazıp seçin..."
                        : "Klinik işlem yazıp seçin..."
                    }
                  />
                </div>
              )}
            </div>
            {/* İşlem Tarihi ve Çekim Tarihi yan yana */}
            <div className="mb-3 flex flex-col sm:flex-row gap-5">
              <div className="flex-1">
                <label className="mb-1 block font-medium">İşlem Tarihi</label>
                <input
                  type="date"
                  value={formData.islem_tarihi}
                  onChange={e => setFormData(fd => ({ ...fd, islem_tarihi: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  max={formData.cekim_tarihi || undefined}
                  disabled={uploading}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block font-medium">Çekim Tarihi</label>
                <input
                  type="date"
                  value={formData.cekim_tarihi}
                  onChange={e => setFormData(fd => ({ ...fd, cekim_tarihi: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  min={formData.islem_tarihi || undefined}
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="mb-3">
              {formData.islem_tarihi && formData.cekim_tarihi && (
                <div className="text-xs mt-1 bg-blue-50 px-3 py-2 rounded border border-blue-100 flex items-center gap-2">
                  <IconCalendar className="w-4 h-4 text-blue-500" />
                  {currentTimeDiff}
                </div>
              )}
            </div>
            {/* Aşama seçimi */}
            <div className="mb-4">
              <label className="mb-1 block font-medium">Aşama</label>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="modal-asama"
                    checked={formData.asama === "Öncesi"}
                    onChange={() => setFormData(fd => ({ ...fd, asama: "Öncesi" }))}
                    disabled={uploading}
                  />
                  Öncesi
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="modal-asama"
                    checked={formData.asama === "Sonrası"}
                    onChange={() => setFormData(fd => ({ ...fd, asama: "Sonrası" }))}
                    disabled={uploading}
                  />
                  Sonrası
                </label>
              </div>
            </div>
            {/* Notlar */}
            <div className="mb-4">
              <label className="mb-1 block font-medium">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={e => setFormData(fd => ({ ...fd, notlar: e.target.value }))}
                maxLength={200}
                rows={3}
                placeholder="Opsiyonel"
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                disabled={uploading}
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                className="border border-gray-300 rounded px-6 py-2 bg-white text-[#4A6E95] hover:bg-gray-100 transition font-semibold"
                onClick={() => {
                  setUploadModalOpen(false);
                  resetForm();
                }}
                disabled={uploading}
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-[#4A6E95] text-white rounded px-6 py-2 font-semibold text-base transition hover:bg-[#3A5878]"
                disabled={
                  uploading ||
                  !formData.hasta_id ||
                  !formData.islem_tarihi ||
                  !formData.cekim_tarihi ||
                  !formData.kategori ||
                  formData.tags.length === 0 ||
                  uploadFiles.length === 0
                }
              >
                {uploading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
        {/* --------------- MODAL: Görsel Büyüt (Lightbox) -------------- */}
        <Modal open={imageModal.open} onClose={() => setImageModal({ open: false })}>
          {imageModal.media && (
            <div className="bg-[#f6fafd] rounded-xl w-[95vw] max-w-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#4A6E95] text-base">
                    {imageModal.media.hasta?.ad} {imageModal.media.hasta?.soyad}
                  </span>
                  {imageModal.media.notlar?.asama && (
                    <span className={
                      imageModal.media.notlar.asama === "Sonrası"
                        ? "ml-3 px-2 py-1 rounded text-xs font-bold bg-green-500 text-white"
                        : "ml-3 px-2 py-1 rounded text-xs font-bold bg-blue-500 text-white"
                    }>
                      {imageModal.media.notlar.asama}
                    </span>
                  )}
                  {imageModal.media.notlar?.zaman_etiketi && (
                    <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold text-xs border border-gray-200">
                      {imageModal.media.notlar.zaman_etiketi}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setImageModal({ open: false })}
                  className="ml-2 p-1 rounded-full hover:bg-slate-200 focus:outline-none"
                  type="button"
                  aria-label="Kapat"
                >
                  <IconX />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-black">
                {imageModal.media.type === "image" ? (
                  <img
                    src={imageModal.media.url}
                    alt={imageModal.media.notlar?.notlar || ""}
                    className="object-contain max-w-[80vw] max-h-[65vh] rounded"
                  />
                ) : (
                  <video
                    src={imageModal.media.url}
                    controls
                    autoPlay
                    className="object-contain max-w-[80vw] max-h-[65vh] rounded"
                  />
                )}
              </div>
              {imageModal.media.tags && (
                <div className="px-6 py-2 text-xs flex gap-2 flex-wrap">
                  {imageModal.media.tags.map((t, i) => (
                    <span key={t + i} className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {imageModal.media.notlar?.notlar && (
                <div className="px-6 py-2 text-sm text-gray-700">
                  {imageModal.media.notlar.notlar}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
