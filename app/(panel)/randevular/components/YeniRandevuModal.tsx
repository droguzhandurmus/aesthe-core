"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  X, Check, Trash2, LoaderCircle, Search, User,
  MessageCircle, MessageSquare, Syringe, Scissors, Eye,
  StickyNote, Calendar, Settings, GripVertical, Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import { type AppointmentForDetail } from "./RandevuDetayModal";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

// ─── Not etiket sistemi (localStorage destekli) ───────────────────────────────

export type EtiketItem = {
  key: string; label: string; emoji: string; active: string; hover: string;
};

const RENK_PALETI = [
  { active: "bg-amber-500 text-white border-amber-500 shadow-sm",   hover: "hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50" },
  { active: "bg-red-500 text-white border-red-500 shadow-sm",       hover: "hover:border-red-400 hover:text-red-600 hover:bg-red-50" },
  { active: "bg-blue-500 text-white border-blue-500 shadow-sm",     hover: "hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50" },
  { active: "bg-emerald-500 text-white border-emerald-500 shadow-sm", hover: "hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50" },
  { active: "bg-purple-500 text-white border-purple-500 shadow-sm", hover: "hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50" },
  { active: "bg-pink-500 text-white border-pink-500 shadow-sm",     hover: "hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50" },
  { active: "bg-cyan-500 text-white border-cyan-500 shadow-sm",     hover: "hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50" },
  { active: "bg-teal-500 text-white border-teal-500 shadow-sm",     hover: "hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50" },
];

const VARSAYILAN_ETIKETLER: EtiketItem[] = [
  { key: "onemli",     label: "Önemli",      emoji: "📌", ...RENK_PALETI[0] },
  { key: "acil",       label: "Acil",        emoji: "🚨", ...RENK_PALETI[1] },
  { key: "hatirlatici",label: "Hatırlatıcı", emoji: "🔔", ...RENK_PALETI[2] },
  { key: "gorev",      label: "Görev",       emoji: "✅", ...RENK_PALETI[3] },
];

export function loadEtiketler(): EtiketItem[] {
  if (typeof window === "undefined") return VARSAYILAN_ETIKETLER;
  try {
    const s = localStorage.getItem("ea_not_etiketler");
    return s ? (JSON.parse(s) as EtiketItem[]) : VARSAYILAN_ETIKETLER;
  } catch { return VARSAYILAN_ETIKETLER; }
}

function saveEtiketler(items: EtiketItem[]) {
  if (typeof window !== "undefined") localStorage.setItem("ea_not_etiketler", JSON.stringify(items));
}

export type NoteForEdit = {
  id: string; baslik: string; baslangic: string; bitis: string | null;
  baslangic_saat: string | null; bitis_saat: string | null;
  etiket: string | null; tekrar: string | null; tekrar_bitis: string | null;
};

const NOT_TEKRAR = [
  { key: "yok",      label: "Yok" },
  { key: "gunluk",   label: "Günlük" },
  { key: "haftalik", label: "Haftalık" },
  { key: "aylik",    label: "Aylık" },
  { key: "ozel",     label: "Özel" },
] as const;

type Patient = { id: number; ad_soyad: string; telefon?: string };

const SURE_SECENEKLERI = [15, 30, 45, 60, 90, 120];

// ─── İşlem türü kategorileri ────────────────────────────────────────────────

const KATEGORILER = ["Görüşme", "Klinik İşlem", "Ameliyat", "Kontrol"] as const;

const KATEGORI_META: Record<string, {
  icon: React.ReactElement;
  placeholder: string;
  localKey: string;
  btn: string;        // seçili buton sınıfları
  btnHover: string;   // seçilmemiş hover sınıfları
  ring: string;       // input focus ring
  listHover: string;  // öneri satırı hover
  listBorder: string; // öneri kutu kenarlığı
  tag: string;        // küçük etiket (badge)
}> = {
  "Görüşme": {
    icon: <MessageSquare size={14} />,
    placeholder: "Ön görüşme, konsültasyon, değerlendirme...",
    localKey: "ea_islem_gorusme",
    btn:       "bg-violet-600 text-white border-violet-600 shadow-sm",
    btnHover:  "hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50",
    ring:      "focus:ring-violet-400",
    listHover: "hover:bg-violet-50 hover:text-violet-700",
    listBorder:"border-violet-200",
    tag:       "bg-violet-50 text-violet-700 border-violet-200",
  },
  "Klinik İşlem": {
    icon: <Syringe size={14} />,
    placeholder: "Botoks, dolgu, peeling, lifting...",
    localKey: "ea_islem_klinik",
    btn:       "bg-sky-600 text-white border-sky-600 shadow-sm",
    btnHover:  "hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50",
    ring:      "focus:ring-sky-400",
    listHover: "hover:bg-sky-50 hover:text-sky-700",
    listBorder:"border-sky-200",
    tag:       "bg-sky-50 text-sky-700 border-sky-200",
  },
  "Ameliyat": {
    icon: <Scissors size={14} />,
    placeholder: "Rinoplasti, meme estetiği, liposuction...",
    localKey: "ea_islem_ameliyat",
    btn:       "bg-rose-600 text-white border-rose-600 shadow-sm",
    btnHover:  "hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50",
    ring:      "focus:ring-rose-400",
    listHover: "hover:bg-rose-50 hover:text-rose-700",
    listBorder:"border-rose-200",
    tag:       "bg-rose-50 text-rose-700 border-rose-200",
  },
  "Kontrol": {
    icon: <Eye size={14} />,
    placeholder: "Post-op kontrol, serum takibi, pansuman...",
    localKey: "ea_islem_kontrol",
    btn:       "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    btnHover:  "hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50",
    ring:      "focus:ring-emerald-400",
    listHover: "hover:bg-emerald-50 hover:text-emerald-700",
    listBorder:"border-emerald-200",
    tag:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

function loadOncekiler(kat: string): string[] {
  if (!kat || typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KATEGORI_META[kat]?.localKey ?? "") ?? "[]") as string[];
  } catch { return []; }
}

function saveOncekiler(kat: string, list: string[]) {
  if (!kat || typeof window === "undefined") return;
  const key = KATEGORI_META[kat]?.localKey;
  if (key) localStorage.setItem(key, JSON.stringify(list));
}

function parseIslemTuru(str: string): { kategori: string; detay: string } {
  if (!str || str === "Belirtilmedi") return { kategori: "", detay: "" };
  for (const k of KATEGORILER) {
    if (str === k) return { kategori: k, detay: "" };
    if (str.startsWith(`${k}: `)) return { kategori: k, detay: str.slice(k.length + 2) };
  }
  return { kategori: "", detay: str };
}

// ─── Hasta arama combobox ────────────────────────────────────────────────────

function PatientCombobox({
  patients, value, onChange, loading, disabled,
}: {
  patients: Patient[];
  value: string;
  onChange: (val: string) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalize = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    return patients.filter((p) => normalize(p.ad_soyad).includes(normalize(search)));
  }, [search, patients]);

  const selectedName = patients.find((p) => p.id.toString() === value)?.ad_soyad ?? "";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={clsx(
            "w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white transition",
            disabled && "opacity-60 pointer-events-none"
          )}
          placeholder="Hasta ara..."
          value={open ? search : selectedName}
          onFocus={() => { setSearch(""); setOpen(true); }}
          onChange={(e) => { setSearch(e.target.value); if (!e.target.value) onChange(""); }}
          disabled={disabled}
        />
        {value && !open && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => { onChange(""); setSearch(""); }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-blue-600 text-sm">
              <LoaderCircle size={14} className="animate-spin" /> Yükleniyor...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-slate-400 text-sm flex items-center gap-2">
              <User size={14} /> Sonuç bulunamadı
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className={clsx(
                  "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition flex items-center gap-2",
                  value === p.id.toString() && "bg-blue-100 font-semibold text-blue-700"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.id.toString());
                  setSearch(p.ad_soyad);
                  setOpen(false);
                }}
              >
                <User size={13} className="text-slate-400 shrink-0" />
                <span className="flex-1 truncate">{p.ad_soyad}</span>
                {p.telefon && <span className="text-xs text-slate-400 shrink-0">{p.telefon}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Yardımcı zaman fonksiyonları ────────────────────────────────────────────

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr || !minutes) return timeStr ?? "";
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 60) % 24)}:${p(total % 60)}`;
}

function timeDiffMinutes(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : diff + 24 * 60;
}

// ─── Tarih parse ─────────────────────────────────────────────────────────────

function parseTarihSaat(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { tarih: "", saat: "" };
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    tarih: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    saat: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  appointment?: AppointmentForDetail | null;
  defaultDate?: string;
  defaultTime?: string;
  initialSure?: number;
  defaultEndDate?: string;
  defaultHastaId?: string;
  defaultHastaAdi?: string;
  defaultHastaTelefon?: string;
  initialMode?: "randevu" | "not";
  defaultNoteDateMode?: "timed" | "allday" | "range";
  editNote?: NoteForEdit | null;
  onSaved: () => void;
  onDeleted?: () => void;
  onNoteSaved?: () => void;
}

export default function YeniRandevuModal({
  open, onClose, appointment, defaultDate, defaultTime, initialSure, defaultEndDate,
  defaultHastaId, defaultHastaAdi, defaultHastaTelefon,
  initialMode = "randevu", defaultNoteDateMode, editNote,
  onSaved, onDeleted, onNoteSaved,
}: Props) {
  const isEdit = !!appointment;

  // ─── Mod (randevu / not) ─────────────────────────────────────────────────
  const [mode, setMode] = useState<"randevu" | "not">(initialMode);

  // ─── Not formu state ────────────────────────────────────────────────────
  const [noteIcerik, setNoteIcerik] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [noteDateMode, setNoteDateMode] = useState<"timed" | "allday" | "range">("allday");
  const [noteStartTime, setNoteStartTime] = useState("");
  const [noteEndTime, setNoteEndTime] = useState("");
  const [noteBitis, setNoteBitis] = useState("");
  const [noteEtiket, setNoteEtiket] = useState<string | null>(null);
  const [noteTekrar, setNoteTekrar] = useState("yok");
  const [noteTekrarBitis, setNoteTekrarBitis] = useState("");
  const [noteTekrarOzelGun, setNoteTekrarOzelGun] = useState(7);
  const [noteTekrarOzelKez, setNoteTekrarOzelKez] = useState(1);
  const [noteTekrarOzelOpen, setNoteTekrarOzelOpen] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [etiketler, setEtiketler] = useState<EtiketItem[]>(VARSAYILAN_ETIKETLER);
  const [etiketAyarOpen, setEtiketAyarOpen] = useState(false);
  const [yeniEtiketEmoji, setYeniEtiketEmoji] = useState("");
  const [yeniEtiketLabel, setYeniEtiketLabel] = useState("");
  const [etiketDrag, setEtiketDrag] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const etiketAyarRef = useRef<HTMLDivElement>(null);

  // ─── Randevu formu state ─────────────────────────────────────────────────
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [hastaId, setHastaId] = useState("");
  const [tarih, setTarih] = useState("");
  const [saat, setSaat] = useState("");
  const [sureDk, setSureDk] = useState(30);
  const [sureozel, setSureozel] = useState(false);
  const [islemKategori, setIslemKategori] = useState("");
  const [islemDetay, setIslemDetay] = useState("");
  const [islemOncekiler, setIslemOncekiler] = useState<string[]>([]);
  const [silinecekIslem, setSilinecekIslem] = useState<string | null>(null);
  const [durum, setDurum] = useState("Bekliyor");
  const [notlar, setNotlar] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [detayOpen, setDetayOpen] = useState(false);
  const detayContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (detayContainerRef.current && !detayContainerRef.current.contains(e.target as Node)) {
        setDetayOpen(false);
        setSilinecekIslem(null);
      }
      if (etiketAyarRef.current && !etiketAyarRef.current.contains(e.target as Node)) {
        setEtiketAyarOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Öneri listesi: kategori + yazdığa göre filtrele
  const filteredSuggestions = useMemo(() => {
    if (!islemKategori || islemOncekiler.length === 0) return [];
    const q = islemDetay.trim().toLocaleLowerCase("tr-TR");
    if (!q) return islemOncekiler;
    return islemOncekiler.filter(item => item.toLocaleLowerCase("tr-TR").includes(q));
  }, [islemDetay, islemOncekiler, islemKategori]);

  // Modal açılınca formu doldur
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      const { tarih: t, saat: s } = parseTarihSaat(appointment.tarih);
      setTarih(t);
      setSaat(s);
      setHastaId(appointment.hasta_id != null ? String(appointment.hasta_id) : "");
      setSureDk(appointment.sure_dk ?? 60);
      const parsed = parseIslemTuru(appointment.islem_turu || "");
      setIslemKategori(parsed.kategori);
      setIslemDetay(parsed.detay);
      setIslemOncekiler(loadOncekiler(parsed.kategori));
      setDurum(appointment.durum ?? "Bekliyor");
      setNotlar(appointment.notlar ?? "");
      if (appointment.hastalar && appointment.hasta_id != null) {
        setPatients([{
          id: appointment.hasta_id as number,
          ad_soyad: appointment.hastalar.ad_soyad,
          telefon: appointment.hastalar.telefon,
        }]);
      }
    } else {
      setTarih(defaultDate ?? "");
      setSaat(defaultTime ?? "");
      setHastaId(defaultHastaId ?? "");
      setSureDk(initialSure ?? 30);
      if (defaultHastaId && defaultHastaAdi) {
        setPatients([{ id: defaultHastaId as unknown as number, ad_soyad: defaultHastaAdi, telefon: defaultHastaTelefon }]);
      }
      setIslemKategori("");
      setIslemDetay("");
      setIslemOncekiler([]);
      setDurum("Bekliyor");
      setNotlar("");
      setPatients([]);
    }
    setSilinecekIslem(null);
    setSureozel(false);
    setDetayOpen(false);
    setError("");
    // Not formu sıfırla
    const loadedEtiketler = loadEtiketler();
    setEtiketler(loadedEtiketler);
    setEtiketAyarOpen(false);
    setNoteTekrarOzelOpen(false);
    setShowDeleteNoteConfirm(false);
    setMode(isEdit ? "randevu" : (editNote ? "not" : (initialMode ?? "randevu")));
    if (editNote) {
      setNoteIcerik(editNote.baslik);
      setNoteDate(editNote.baslangic);
      setNoteStartTime(editNote.baslangic_saat ?? "");
      setNoteEndTime(editNote.bitis_saat ?? "");
      setNoteBitis(editNote.bitis ?? "");
      setNoteEtiket(editNote.etiket);
      if (editNote.bitis) setNoteDateMode("range");
      else if (editNote.baslangic_saat) setNoteDateMode("timed");
      else setNoteDateMode("allday");
      if (editNote.tekrar?.startsWith("ozel:")) {
        const parts = editNote.tekrar.split(":");
        setNoteTekrar("ozel");
        setNoteTekrarOzelGun(parseInt(parts[1]) || 7);
        setNoteTekrarOzelKez(parseInt(parts[2]) || 1);
      } else {
        setNoteTekrar(editNote.tekrar ?? "yok");
        setNoteTekrarOzelGun(7);
        setNoteTekrarOzelKez(1);
      }
      setNoteTekrarBitis(editNote.tekrar_bitis ?? "");
    } else {
      setNoteIcerik("");
      setNoteDate(defaultDate ?? "");
      const dm = defaultNoteDateMode ?? (!defaultTime ? "allday" : "timed");
      setNoteDateMode(dm);
      setNoteStartTime(defaultTime ?? "");
      setNoteEndTime(defaultTime && initialSure ? addMinutesToTime(defaultTime, initialSure) : "");
      setNoteBitis(defaultEndDate ?? "");
      setNoteEtiket(null);
      setNoteTekrar("yok");
      setNoteTekrarOzelGun(7);
      setNoteTekrarOzelKez(1);
      setNoteTekrarBitis("");
    }
    setNoteError("");
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id, editNote?.id, defaultDate, defaultTime, initialSure, initialMode, defaultNoteDateMode, defaultEndDate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Kategori değişince öneri listesini yükle
  useEffect(() => {
    setIslemOncekiler(loadOncekiler(islemKategori));
    setSilinecekIslem(null);
    setDetayOpen(false);
  }, [islemKategori]);

  async function fetchPatients() {
    setLoadingPatients(true);
    const { data } = await supabase.from("hastalar").select("id, ad_soyad, telefon").order("ad_soyad");
    setLoadingPatients(false);
    if (data) setPatients(data as Patient[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!hastaId) { setError("Lütfen bir hasta seçin."); return; }
    if (!tarih || !saat) { setError("Tarih ve saat zorunludur."); return; }

    setSaving(true);

    // Yerel saati UTC offset ile gönder (timestamptz sütunu için)
    const localDate = new Date(`${tarih}T${saat}:00`);
    const offset = -localDate.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const absOff = Math.abs(offset);
    const tarihISO = `${tarih}T${saat}:00${sign}${String(Math.floor(absOff / 60)).padStart(2, "0")}:${String(absOff % 60).padStart(2, "0")}`;

    // İşlem türü string'i oluştur ve öneriyi kaydet
    const detay = islemDetay.trim();
    let islemTuruFinal: string;
    if (!islemKategori) {
      islemTuruFinal = detay || "Belirtilmedi";
    } else {
      if (detay) {
        const list = loadOncekiler(islemKategori);
        if (!list.includes(detay)) {
          const newList = [detay, ...list];
          saveOncekiler(islemKategori, newList);
          setIslemOncekiler(newList);
        }
      }
      islemTuruFinal = islemKategori + (detay ? `: ${detay}` : "");
    }

    const payload = {
      hasta_id: hastaId || null,
      tarih: tarihISO,
      sure_dk: sureDk,
      islem_turu: islemTuruFinal,
      durum,
      notlar: notlar.trim() || null,
    };

    let err;
    if (isEdit && appointment) {
      const res = await supabase.from("randevular").update(payload).eq("id", appointment.id);
      err = res.error;
    } else {
      const res = await supabase.from("randevular").insert([payload]);
      err = res.error;
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!appointment) return;
    setDeleting(true);
    await supabase.from("randevular").delete().eq("id", appointment.id);
    setDeleting(false);
    setShowDeleteConfirm(false);
    onDeleted?.();
    onClose();
  }

  function handleDeleteSuggestion(item: string) {
    const newList = islemOncekiler.filter(x => x !== item);
    saveOncekiler(islemKategori, newList);
    setIslemOncekiler(newList);
    setSilinecekIslem(null);
  }

  async function handleNoteSave() {
    if (!noteIcerik.trim()) { setNoteError("Not içeriği zorunludur."); return; }
    if (!noteDate) { setNoteError("Tarih zorunludur."); return; }
    if (noteDateMode === "range" && !noteBitis) { setNoteError("Bitiş tarihi zorunludur."); return; }
    setNoteSaving(true);
    setNoteError("");
    const tekrarVal = noteTekrar === "ozel"
      ? `ozel:${noteTekrarOzelGun}:${noteTekrarOzelKez}`
      : (noteTekrar !== "yok" ? noteTekrar : null);
    const payload = {
      baslik: noteIcerik.trim(),
      baslangic: noteDate,
      bitis: noteDateMode === "range" ? noteBitis || null : null,
      baslangic_saat: noteDateMode !== "allday" && noteStartTime ? noteStartTime : null,
      bitis_saat: noteDateMode !== "allday" && noteEndTime ? noteEndTime : null,
      etiket: noteEtiket,
      tekrar: tekrarVal,
      tekrar_bitis: tekrarVal && noteTekrarBitis ? noteTekrarBitis : null,
    };
    let err;
    if (editNote) {
      const res = await supabase.from("takvim_notlari").update(payload).eq("id", editNote.id);
      err = res.error;
    } else {
      const res = await supabase.from("takvim_notlari").insert([payload]);
      err = res.error;
    }
    setNoteSaving(false);
    if (err) { setNoteError(err.message); return; }
    onNoteSaved?.();
    onClose();
  }

  async function handleNoteDelete() {
    if (!editNote) return;
    setNoteSaving(true);
    await supabase.from("takvim_notlari").delete().eq("id", editNote.id);
    setNoteSaving(false);
    setShowDeleteNoteConfirm(false);
    onNoteSaved?.();
    onClose();
  }

  function handleEtiketEkle() {
    if (!yeniEtiketEmoji.trim() || !yeniEtiketLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    const renk = RENK_PALETI[etiketler.length % RENK_PALETI.length];
    const newList = [...etiketler, { key, label: yeniEtiketLabel.trim(), emoji: yeniEtiketEmoji.trim(), ...renk }];
    setEtiketler(newList);
    saveEtiketler(newList);
    setYeniEtiketEmoji("");
    setYeniEtiketLabel("");
  }

  function handleEtiketSil(key: string) {
    const newList = etiketler.filter(e => e.key !== key);
    setEtiketler(newList);
    saveEtiketler(newList);
    if (noteEtiket === key) setNoteEtiket(null);
  }

  if (!open) return null;

  const hastaAdiForConfirm = appointment?.hastalar?.ad_soyad ?? "bu randevu";

  const durumOptions = isEdit
    ? ["Bekliyor", "Onaylandı", "İptal", "Tamamlandı"]
    : ["Bekliyor", "Onaylandı"];

  return (
    <>
    <ConfirmModal
      open={showDeleteConfirm}
      title="Randevu Silinecek"
      message={`"${hastaAdiForConfirm}" adlı hastanın randevusu kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
      confirmLabel="Evet, Sil"
      loading={deleting}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    <ConfirmModal
      open={showDeleteNoteConfirm}
      title="Not Silinecek"
      message="Bu takvim notu kalıcı olarak silinecek. Bu işlem geri alınamaz."
      confirmLabel="Evet, Sil"
      loading={noteSaving}
      onConfirm={handleNoteDelete}
      onCancel={() => setShowDeleteNoteConfirm(false)}
    />
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            {isEdit ? (
              <>
                <span className="font-semibold text-blue-800 text-base">Randevu Düzenle</span>
                {appointment.hastalar && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Link
                      href={`/hastalar/hasta-listesi/${appointment.hasta_id}`}
                      className="text-xs text-blue-500 hover:underline"
                      onClick={onClose}
                    >
                      {appointment.hastalar.ad_soyad} →
                    </Link>
                    {appointment.hastalar.telefon && (
                      <a
                        href={`https://wa.me/${appointment.hastalar.telefon.replace(/\D/g, "").replace(/^\+/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        <MessageCircle size={11} />
                        WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMode("randevu")}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition",
                    mode === "randevu" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Calendar size={14} /> Yeni Randevu
                </button>
                <button
                  type="button"
                  onClick={() => setMode("not")}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition",
                    mode === "not" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <StickyNote size={14} /> Not Ekle
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500" type="button">
            <X size={18} />
          </button>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={mode === "not" ? (e) => { e.preventDefault(); handleNoteSave(); } : handleSubmit}
          className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1"
        >
          {mode === "randevu" ? (
            <>
              {/* Hasta */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Hasta <span className="text-red-500">*</span>
                </label>
                <PatientCombobox
                  patients={patients}
                  value={hastaId}
                  onChange={setHastaId}
                  loading={loadingPatients}
                  disabled={saving || deleting}
                />
              </div>

              {/* Tarih + Başlangıç + Bitiş */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tarih <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tarih}
                    onChange={(e) => setTarih(e.target.value)}
                    disabled={saving || deleting}
                    className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Başlangıç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={saat}
                    onChange={(e) => setSaat(e.target.value)}
                    disabled={saving || deleting}
                    className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bitiş</label>
                  <input
                    type="time"
                    value={addMinutesToTime(saat, sureDk)}
                    onChange={(e) => {
                      const diff = timeDiffMinutes(saat, e.target.value);
                      if (diff >= 5) { setSureDk(diff); setSureozel(!SURE_SECENEKLERI.includes(diff)); }
                    }}
                    disabled={saving || deleting || !saat}
                    className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Süre */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Süre</label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {SURE_SECENEKLERI.map((dk) => (
                    <button
                      key={dk}
                      type="button"
                      onClick={() => { setSureDk(dk); setSureozel(false); }}
                      disabled={saving || deleting}
                      className={clsx(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition",
                        sureDk === dk && !sureozel
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                      )}
                    >
                      {dk} dk
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSureozel((v) => !v)}
                    disabled={saving || deleting}
                    className={clsx(
                      "px-3 py-1.5 rounded-full text-sm font-medium border transition",
                      sureozel
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                    )}
                  >
                    Özel
                  </button>
                  {sureozel && (
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={sureDk}
                      onChange={(e) => setSureDk(Math.max(5, parseInt(e.target.value, 10) || 5))}
                      disabled={saving || deleting}
                      className="w-20 border rounded-full text-sm text-center py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      placeholder="dk"
                    />
                  )}
                </div>
              </div>

              {/* ── İşlem Türü ── */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">İşlem Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  {KATEGORILER.map((kat) => {
                    const meta = KATEGORI_META[kat];
                    const selected = islemKategori === kat;
                    return (
                      <button
                        key={kat}
                        type="button"
                        disabled={saving || deleting}
                        onClick={() => {
                          setIslemKategori(prev => prev === kat ? "" : kat);
                          setIslemDetay("");
                        }}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition text-left",
                          selected
                            ? meta.btn
                            : `bg-white text-slate-600 border-slate-200 ${meta.btnHover}`
                        )}
                      >
                        {meta.icon}
                        {kat}
                      </button>
                    );
                  })}
                </div>
                {islemKategori && (() => {
                  const meta = KATEGORI_META[islemKategori];
                  return (
                    <div ref={detayContainerRef} className="mt-3 relative">
                      <input
                        type="text"
                        value={islemDetay}
                        onChange={(e) => { setIslemDetay(e.target.value); setSilinecekIslem(null); }}
                        onFocus={() => setDetayOpen(true)}
                        placeholder={meta?.placeholder}
                        disabled={saving || deleting}
                        className={clsx(
                          "w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 transition",
                          meta?.ring ?? "focus:ring-blue-400"
                        )}
                        maxLength={100}
                        autoFocus
                      />
                      {detayOpen && filteredSuggestions.length > 0 && (
                        <div className={clsx(
                          "mt-1.5 border rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm",
                          meta?.listBorder ?? "border-slate-200"
                        )}>
                          {filteredSuggestions.map((item) => (
                            <div key={item}>
                              {silinecekIslem === item ? (
                                <div className="flex items-center justify-between px-3 py-2 bg-red-50">
                                  <span className="text-xs text-red-700 min-w-0 truncate mr-2">
                                    <span className="font-semibold">"{item}"</span> listeden kaldırılsın mı?
                                  </span>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onMouseDown={(e) => { e.preventDefault(); setSilinecekIslem(null); }}
                                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition font-medium"
                                    >
                                      Hayır
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => { e.preventDefault(); handleDeleteSuggestion(item); }}
                                      className="px-2.5 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium"
                                    >
                                      Evet, Sil
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center group">
                                  <button
                                    type="button"
                                    className={clsx(
                                      "flex-1 text-left px-3 py-2 text-sm text-slate-700 transition",
                                      meta?.listHover ?? "hover:bg-blue-50 hover:text-blue-700"
                                    )}
                                    onMouseDown={(e) => { e.preventDefault(); setIslemDetay(item); setDetayOpen(false); }}
                                  >
                                    {item}
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                    onMouseDown={(e) => { e.preventDefault(); setSilinecekIslem(item); }}
                                    title="Listeden kaldır"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Durum */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Durum</label>
                <select
                  value={durum}
                  onChange={(e) => setDurum(e.target.value)}
                  disabled={saving || deleting}
                  className="w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition"
                >
                  {durumOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notlar</label>
                <textarea
                  value={notlar}
                  onChange={(e) => setNotlar(e.target.value)}
                  rows={1}
                  disabled={saving || deleting}
                  className="w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition"
                  placeholder="Ek not..."
                  maxLength={300}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || deleting}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Sil
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving || deleting}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition shadow-sm",
                    saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                  {isEdit ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Not içeriği */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Not <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={noteIcerik}
                  onChange={(e) => setNoteIcerik(e.target.value)}
                  rows={3}
                  disabled={noteSaving}
                  autoFocus
                  className="w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none transition"
                  placeholder="Not içeriğini girin..."
                  maxLength={500}
                />
              </div>

              {/* Etiket + Ayarlar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Etiket</span>
                  <div ref={etiketAyarRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setEtiketAyarOpen(v => !v)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition px-1.5 py-0.5 rounded hover:bg-slate-100"
                    >
                      <Settings size={12} /> Düzenle
                    </button>
                    {etiketAyarOpen && (
                      <div className="absolute right-0 top-full mt-1 z-[60] bg-white border border-slate-200 rounded-xl shadow-xl w-64 overflow-hidden">
                        <div className="px-3 py-2 border-b bg-slate-50">
                          <span className="text-xs font-semibold text-slate-600">Etiketleri Düzenle</span>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {etiketler.map((et, fi) => (
                            <div
                              key={et.key}
                              className={clsx(
                                "flex items-center gap-2 px-3 py-2 group transition",
                                etiketDrag === et.key ? "bg-orange-50" : "hover:bg-slate-50"
                              )}
                              onPointerEnter={() => {
                                if (!etiketDrag || etiketDrag === et.key) return;
                                setEtiketler(prev => {
                                  const arr = [...prev];
                                  const ti = arr.findIndex(e => e.key === etiketDrag);
                                  if (ti === -1) return prev;
                                  const [item] = arr.splice(ti, 1);
                                  arr.splice(fi, 0, item);
                                  saveEtiketler(arr);
                                  return arr;
                                });
                              }}
                            >
                              <span
                                className="text-slate-300 cursor-grab active:cursor-grabbing touch-none select-none"
                                onPointerDown={(e) => {
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                  setEtiketDrag(et.key);
                                  document.body.style.userSelect = "none";
                                }}
                                onPointerUp={() => { setEtiketDrag(null); document.body.style.userSelect = ""; }}
                              >
                                <GripVertical size={13} />
                              </span>
                              <span className="text-base leading-none">{et.emoji}</span>
                              <span className="flex-1 text-sm text-slate-700 truncate">{et.label}</span>
                              <button
                                type="button"
                                onClick={() => handleEtiketSil(et.key)}
                                className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="px-3 py-2 border-t bg-slate-50 flex gap-1.5 relative">
                          <button
                            type="button"
                            onClick={() => setEmojiPickerOpen(v => !v)}
                            className="w-10 shrink-0 text-center border rounded-lg py-1.5 text-lg hover:bg-white transition focus:outline-none focus:ring-1 focus:ring-orange-400"
                            title="Emoji seç"
                          >
                            {yeniEtiketEmoji || "😊"}
                          </button>
                          {emojiPickerOpen && (
                            <div className="absolute bottom-full left-0 mb-1 z-[70]">
                              <Picker
                                data={emojiData}
                                onEmojiSelect={(e: { native: string }) => {
                                  setYeniEtiketEmoji(e.native);
                                  setEmojiPickerOpen(false);
                                }}
                                locale="tr"
                                theme="light"
                                previewPosition="none"
                                skinTonePosition="none"
                                set="native"
                              />
                            </div>
                          )}
                          <input
                            type="text"
                            value={yeniEtiketLabel}
                            onChange={(e) => setYeniEtiketLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEtiketEkle(); } }}
                            placeholder="Etiket adı..."
                            className="flex-1 border rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                            maxLength={20}
                          />
                          <button
                            type="button"
                            onClick={handleEtiketEkle}
                            className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {etiketler.map((et) => (
                    <button
                      key={et.key}
                      type="button"
                      disabled={noteSaving}
                      onClick={() => setNoteEtiket(noteEtiket === et.key ? null : et.key)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition",
                        noteEtiket === et.key
                          ? et.active
                          : `bg-white text-slate-600 border-slate-200 ${et.hover}`
                      )}
                    >
                      <span>{et.emoji}</span>
                      {et.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarih + Mod */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tarih <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    disabled={noteSaving}
                    className="flex-1 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                  <button
                    type="button"
                    disabled={noteSaving}
                    onClick={() => setNoteDateMode(noteDateMode === "allday" ? "timed" : "allday")}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition whitespace-nowrap",
                      noteDateMode === "allday"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
                    )}
                  >
                    Tüm Gün
                  </button>
                  <button
                    type="button"
                    disabled={noteSaving}
                    onClick={() => {
                      const next = noteDateMode === "range" ? "timed" : "range";
                      setNoteDateMode(next);
                      if (next === "range" && noteDate && (!noteBitis || noteBitis <= noteDate)) {
                        const d = new Date(`${noteDate}T00:00:00`);
                        d.setDate(d.getDate() + 1);
                        setNoteBitis(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                      }
                    }}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition whitespace-nowrap",
                      noteDateMode === "range"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
                    )}
                  >
                    Tarih Aralığı
                  </button>
                </div>
              </div>

              {/* Saatler (timed modda) */}
              {noteDateMode === "timed" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Başlangıç saati</label>
                    <input
                      type="time"
                      value={noteStartTime}
                      onChange={(e) => setNoteStartTime(e.target.value)}
                      disabled={noteSaving}
                      className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bitiş saati</label>
                    <input
                      type="time"
                      value={noteEndTime}
                      onChange={(e) => setNoteEndTime(e.target.value)}
                      disabled={noteSaving}
                      className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                    />
                  </div>
                </div>
              )}

              {/* Bitiş tarihi + saatler (range modda) */}
              {noteDateMode === "range" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bitiş tarihi <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={noteBitis}
                      onChange={(e) => setNoteBitis(e.target.value)}
                      min={noteDate}
                      disabled={noteSaving}
                      className="w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Başlangıç saati</label>
                      <input
                        type="time"
                        value={noteStartTime}
                        onChange={(e) => setNoteStartTime(e.target.value)}
                        disabled={noteSaving}
                        className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Bitiş saati</label>
                      <input
                        type="time"
                        value={noteEndTime}
                        onChange={(e) => setNoteEndTime(e.target.value)}
                        disabled={noteSaving}
                        className="w-full border rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Tekrar */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Tekrar</label>
                <div className="flex flex-wrap gap-2">
                  {NOT_TEKRAR.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      disabled={noteSaving}
                      onClick={() => {
                        setNoteTekrar(t.key);
                        if (t.key === "ozel") setNoteTekrarOzelOpen(true);
                        else setNoteTekrarOzelOpen(false);
                      }}
                      className={clsx(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition",
                        noteTekrar === t.key
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {noteTekrar === "ozel" && noteTekrarOzelOpen && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-600">Her</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={noteTekrarOzelGun}
                      onChange={(e) => setNoteTekrarOzelGun(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border border-orange-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                    />
                    <span className="text-sm text-slate-600">günde</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={noteTekrarOzelKez}
                      onChange={(e) => setNoteTekrarOzelKez(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center border border-orange-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                    />
                    <span className="text-sm text-slate-600">kez tekrar et</span>
                    <button
                      type="button"
                      onClick={() => setNoteTekrarOzelOpen(false)}
                      className="ml-auto text-xs text-orange-600 hover:text-orange-800 font-medium"
                    >
                      Tamam
                    </button>
                  </div>
                )}
                {noteTekrar !== "yok" && (
                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tekrar bitiş tarihi</label>
                    {noteTekrarBitis ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="date"
                          value={noteTekrarBitis}
                          onChange={(e) => setNoteTekrarBitis(e.target.value)}
                          min={noteDate}
                          disabled={noteSaving}
                          className="flex-1 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setNoteTekrarBitis("")}
                          disabled={noteSaving}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition"
                          title="Tarihi kaldır"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={noteSaving}
                        onClick={() => {
                          const d = noteDate ? new Date(`${noteDate}T00:00:00`) : new Date();
                          d.setMonth(d.getMonth() + 1);
                          setNoteTekrarBitis(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                        }}
                        className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-400 hover:border-orange-400 hover:text-orange-500 transition text-left flex items-center gap-2"
                      >
                        <Plus size={13} /> Bitiş tarihi belirle (opsiyonel)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {noteError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {noteError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {editNote && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteNoteConfirm(true)}
                    disabled={noteSaving}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={noteSaving}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={noteSaving}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition shadow-sm",
                    noteSaving ? "bg-orange-400" : "bg-orange-500 hover:bg-orange-600"
                  )}
                >
                  {noteSaving ? <LoaderCircle size={14} className="animate-spin" /> : <StickyNote size={14} />}
                  {editNote ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
    </>
  );
}
