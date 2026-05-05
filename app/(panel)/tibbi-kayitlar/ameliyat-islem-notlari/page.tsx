"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  User,
  LoaderCircle,
  X,
  Check,
  Calendar as CalendarIcon,
  Trash2,
  BookCopy,
  Bookmark,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";

// --- Types ---
type IslemNotu = {
  id: number;
  hasta_id: number;
  created_at: string;
  baslik: string; // virgülle ayrılmış string
  not: string;
  tur: "Ameliyat" | "Klinik İşlem";
  islem_tarihi: string;
  hastalar?: {
    id: number;
    ad_soyad: string;
  };
};

type Patient = {
  id: number;
  ad_soyad: string;
};

type NewNoteFields = {
  hasta_id: number | null;
  basliklar: string[]; // ÇOKLU seçim (string[])
  not: string;
  tur: "Ameliyat" | "Klinik İşlem";
  islem_tarihi: string;
};

type NoteTemplate = {
  id: number;
  basliklar: string; // virgüllerle
  tur: "Ameliyat" | "Klinik İşlem";
  icerik: string;
  created_at: string;
};

// --- Sabit Başlık Listeleri ---
const AMELIYAT_BASLIKLARI = [
  "Rinoplasti",
  "Meme Estetiği",
  "Liposuction",
  "Göz Kapağı"
];
const KLINIK_BASLIKLARI = [
  "Botoks",
  "Dolgu",
  "Mezoterapi",
  "PRP"
];

// --- Helper Functions ---
const formatDate = (dt: string) => {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" });
};
const truncateText = (text: string, maxLines: number = 2) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + " ...";
};
const getGridCols = () => {
  if (typeof window === "undefined") return 1;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
};

// --- Multi-Select Combobox for İşlemler ---
function MultiSelectCombobox(props: {
  selected: string[];
  setSelected: (arr: string[]) => void;
  options: string[];
  placeholder?: string;
}) {
  const { selected, setSelected, options, placeholder } = props;
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [optList, setOptList] = useState<string[]>(options);
  const ref = useRef<HTMLInputElement>(null);

  // Dış tıklama kapama
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (ref.current && !ref.current.parentElement?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!inputVal.trim()) return optList;
    return optList.filter(
      (opt) =>
        opt.toLocaleLowerCase("tr-TR").includes(inputVal.toLocaleLowerCase("tr-TR"))
    );
  }, [inputVal, optList]);

  // Enter tuşuyla yeni ekle (add if not exists, min 2 harf)
  function handleNewAdd() {
    const yeni = inputVal.trim();
    if (!yeni || yeni.length < 2 || optList.includes(yeni)) return;
    setOptList((prev) => [...prev, yeni]);
    setSelected([...selected, yeni]);
    setInputVal("");
    setOpen(false);
  }
  function toggleSel(label: string) {
    if (selected.includes(label)) {
      setSelected(selected.filter((x) => x !== label));
    } else {
      setSelected([...selected, label]);
    }
  }

  // Chip X ile çıkar
  function removeChip(label: string) {
    setSelected(selected.filter((x) => x !== label));
  }

  return (
    <div className="relative min-h-[40px] text-[1.03rem]">
      <div
        className={clsx(
          "flex flex-wrap items-center min-h-[40px] w-full border rounded-lg px-2.5 pr-10 py-2 gap-x-2 gap-y-1 bg-white transition-all shadow-sm cursor-text focus-within:ring-2 focus-within:ring-blue-400",
          open ? "ring-2 ring-blue-400 border-blue-300" : "border-blue-200"
        )}
        tabIndex={-1}
        onClick={() => {
          setOpen(true);
          ref.current?.focus();
        }}
      >
        {/* Chip/kutular */}
        {selected.map((val) => (
          <div
            key={val}
            className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 font-semibold text-sm shadow-sm"
          >
            {val}
            <button
              tabIndex={-1}
              type="button"
              className="ml-1 rounded-full hover:bg-blue-100 p-0.5"
              onClick={e => {
                e.stopPropagation();
                removeChip(val);
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <input
          ref={ref}
          type="text"
          value={open ? inputVal : ""}
          placeholder={selected.length ? "" : (placeholder ?? "İşlem seç veya yeni ekle...")}
          className="flex-1 min-w-[80px] outline-none border-none bg-transparent py-1 text-gray-900 placeholder:text-slate-400 focus:ring-0"
          onFocus={() => setOpen(true)}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Ekli değilse yeni ekle, listede varsa ekle
              if (inputVal.trim().length < 2) return;
              if (optList.includes(inputVal.trim())) {
                toggleSel(inputVal.trim());
                setInputVal("");
              }
              else {
                handleNewAdd();
              }
            }
            if (e.key === "Backspace" && !inputVal && selected.length) {
              removeChip(selected[selected.length - 1]);
            }
          }}
          maxLength={60}
          autoComplete="off"
        />
      </div>
      <div className={clsx(
        "absolute left-0 right-0 z-30 bg-white border rounded-lg max-h-56 overflow-y-auto shadow mt-1 transition-all",
        open ? "" : "hidden"
      )}>
        {filtered.length ? filtered.map(opt => (
          <button
            key={opt}
            type="button"
            tabIndex={-1}
            className={clsx(
              "w-full px-3 py-2 flex items-center gap-2 text-[1rem] hover:bg-blue-50",
              selected.includes(opt) && "bg-blue-100 font-bold"
            )}
            onMouseDown={e => {
              e.preventDefault();
              toggleSel(opt);
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              readOnly
              className="accent-blue-600"
            />
            {opt}
            {selected.includes(opt) &&
              <Check size={16} className="ml-auto text-green-600" />}
          </button>
        )) : (
          <div className="px-3 py-2 text-gray-500 text-[0.98rem]">
            Kayıtlı işlem yok
          </div>
        )}
        {/* + yeni ekle */}
        {!!inputVal.trim() && !optList.includes(inputVal.trim()) && (
          <button
            type="button"
            tabIndex={-1}
            className="w-full px-3 py-2 flex items-center gap-2 text-blue-600 hover:bg-blue-50 font-bold border-t"
            onMouseDown={e => {
              e.preventDefault();
              handleNewAdd();
            }}
          >
            <Plus size={17} /> <span className="italic">"{inputVal.trim()}"</span> ekle
          </button>
        )}
      </div>
    </div>
  );
}

// --- Şablon Drawer/Modern ---
function NoteTemplateDrawer(props: {
  open: boolean;
  onClose: () => void;
  tur: "Ameliyat" | "Klinik İşlem";
  basliklar: string[];
  textareaValue: string;
  setTextareaValue: (s: string) => void;
}) {
  const { open, onClose, tur, basliklar, textareaValue, setTextareaValue } = props;
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Şablonları getir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // tüm mevcut işlemlerden (multi) biriyle eşleşen, ve türü eşleşen
    supabase
      .from("not_sablonlari")
      .select("*")
      .eq("tur", tur)
      .in("basliklar", basliklar.length ? basliklar : [""])
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) setTemplates([]);
        else setTemplates((data as NoteTemplate[]) || []);
      });
  // eslint-disable-next-line
  }, [open, tur, basliklar.join(",")]);

  // Şablon ekle
  async function handleAddTemplate() {
    setError(""); setSuccess("");
    if (!textareaValue.trim() || !basliklar.length) {
      setError("İşlem(ler) ve not içeriği gerekli.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("not_sablonlari").insert({
      basliklar: basliklar.join(","),
      tur,
      icerik: textareaValue.trim(),
    });
    setSaving(false);
    if (error) setError("Kaydedilemedi.");
    else {
      setSuccess("Şablon olarak kaydedildi");
      setTimeout(() => setSuccess(""), 1100);
    }
    // Local güncelle
    setTemplates((prev: NoteTemplate[]) => [
      {
        id: Math.random(),
        basliklar: basliklar.join(","),
        tur,
        icerik: textareaValue.trim(),
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/30 animate-fade-in" onClick={onClose}/>
      <div className={clsx(
        "fixed top-0 right-0 h-full w-full sm:w-[440px] max-w-full z-[81] bg-white shadow-2xl transition-all duration-300 border-l border-blue-100",
        open ? "animate-slide-left-in" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-blue-100">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-xl">
            <Bookmark size={23}/> Kayıtlı Notlar
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-blue-700 rounded-full p-1.5 transition">
            <X size={26}/>
          </button>
        </div>
        <div className="py-4 px-5 flex flex-col gap-3 overflow-y-auto max-h-[68vh] min-h-[250px]">
          {loading ? (
            <div className="text-blue-500 flex items-center justify-center min-h-[150px]">
              <LoaderCircle className="animate-spin" size={30}/>
            </div>
          ) : (
            templates.length ? templates.map(t =>
              <div key={t.id}
                className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-2 cursor-pointer hover:bg-blue-100/80 shadow-sm transition group"
                onClick={() => {
                  if (!textareaValue) setTextareaValue(t.icerik);
                  else if (window.confirm("Bu şablonu Detay alanına eklemek istiyor musunuz? 'Tamam' ile mevcut yazının üstüne yazar, 'İptal' ile mevcut yazının sonuna ekler.")) setTextareaValue(t.icerik);
                  else setTextareaValue(textareaValue ? textareaValue + "\n" + t.icerik : t.icerik);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2 pb-1">
                  <FileText size={16} className="text-blue-500"/>
                  <div className="font-bold text-blue-900 truncate text-sm">
                    {t.basliklar}
                  </div>
                </div>
                <div className="whitespace-pre-line text-blue-900 text-[0.97rem] pl-1 line-clamp-2 font-medium group-hover:underline">
                  {truncateText(t.icerik, 2)}
                </div>
              </div>
            ) : (
              <div className="text-blue-600/70 text-center font-medium pt-20">Şablon bulunamadı</div>
            )
          )}
        </div>
        <div className="p-5 border-t flex flex-col gap-3">
          {success && <div className="text-green-700 flex gap-2 items-center font-semibold text-sm"><Check size={15}/>{success}</div>}
          {error && <div className="text-red-500 flex gap-2 items-center font-semibold text-sm"><X size={15}/>{error}</div>}
          <button
            type="button"
            disabled={saving}
            className={clsx(
              "rounded-lg w-full bg-blue-800 hover:bg-blue-700 transition font-bold flex items-center justify-center gap-2 text-white py-2 px-2.5 mt-2 shadow",
              saving && "opacity-60 pointer-events-none"
            )}
            onClick={handleAddTemplate}
          >
            {saving ? <LoaderCircle className="animate-spin" size={18}/> : <Plus size={18}/>} Mevcut Yazıyı Şablon Olarak Kaydet
          </button>
        </div>
      </div>
    </>
  );
}

// --- Hasta Combobox (Kısmen Geliştirilmiş) ---
function PatientCombobox(props: {
  value: number | null;
  setValue: (v: number) => void;
  patients: Patient[];
}) {
  const { value, setValue, patients } = props;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dış tıklama
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { if (!open) setSearch(""); }, [open]);
  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    return patients.filter(p => p.ad_soyad.toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR"))
    );
  }, [search, patients]);

  const selPatient = patients.find(p => p.id === value);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={selPatient ? selPatient.ad_soyad : "Hasta ara/seç"}
        className="w-full border rounded-lg px-3 py-2 outline-0 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
        onFocus={() => setOpen(true)}
        value={open ? search : (selPatient?.ad_soyad ?? "")}
        onChange={e => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        autoComplete="off"
      />
      <div className={clsx(
        "absolute left-0 right-0 z-30 bg-white border rounded-lg max-h-40 overflow-y-auto shadow mt-1 transition-all",
        open ? "" : "hidden"
      )}>
        {filtered.length
          ? filtered.map(p => (
            <button
              key={p.id}
              type="button"
              tabIndex={-1}
              className={clsx(
                "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-100",
                value === p.id && "bg-blue-100 font-bold"
              )}
              onMouseDown={e => {
                e.preventDefault();
                setValue(p.id);
                setOpen(false);
              }}
            >
              <User size={15} /> {p.ad_soyad}
              {value === p.id &&
                <Check size={16} className="ml-auto text-green-600" />}
            </button>
          ))
          : <div className="px-3 py-2 text-gray-400 text-sm">Kayıt Yok</div>
        }
      </div>
    </div>
  );
}

/** Tür Radio */
function NoteTypeRadio(props: {
  value: "Ameliyat" | "Klinik İşlem";
  setValue: (t: "Ameliyat" | "Klinik İşlem") => void;
}) {
  const { value, setValue } = props;
  return (
    <div className="flex gap-7 mt-1 mb-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="tur"
          className="accent-red-600"
          checked={value === "Ameliyat"}
          onChange={() => setValue("Ameliyat")}
        />
        <span className="text-red-600 font-bold">Ameliyat</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="tur"
          className="accent-blue-600"
          checked={value === "Klinik İşlem"}
          onChange={() => setValue("Klinik İşlem")}
        />
        <span className="text-blue-600 font-bold">Klinik İşlem</span>
      </label>
    </div>
  );
}

// --- Not Ekle Modalı (Yenilenmiş) ---
function NoteAddModal(props: {
  open: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  fields: NewNoteFields;
  setFields: (fields: NewNoteFields | ((f: NewNoteFields) => NewNoteFields)) => void;
  patients: Patient[];
  saving: boolean;
}) {
  const { open, onClose, onSave, fields, setFields, patients, saving } = props;

  // Şablon Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Multi select opsiyonları
  const OPTIONS = fields.tur === "Ameliyat" ? AMELIYAT_BASLIKLARI : KLINIK_BASLIKLARI;

  // Validation
  const canSave = fields.hasta_id
    && fields.basliklar.length > 0
    && fields.not.length > 4
    && fields.islem_tarihi;

  // Tür değişirse işlemler sıfırlansın (örnek: Ameliyattan kliniğe geçen)
  useEffect(() => {
    setFields((f: NewNoteFields) => ({
      ...f,
      basliklar: [],
    }));
    // eslint-disable-next-line
  }, [fields.tur]);

  // Drawer kapandığında bir daha render focus yok
  useEffect(() => { if (!open) setDrawerOpen(false); }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
        <div className="relative w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-9">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            onClick={onClose}><X size={26}/></button>
          <div className="flex items-center justify-between pb-1 mb-3 gap-4">
            <div className="text-blue-900 text-2xl font-extrabold flex items-center gap-2">
              <Plus size={25}/> Yeni Not Ekle
            </div>
          </div>
          <form onSubmit={onSave} className="grid md:grid-cols-2 gap-x-7 gap-y-4">
            {/* Hasta seçimi */}
            <div className="col-span-full md:col-span-1">
              <label className="block text-blue-900 font-semibold mb-1 flex gap-1 items-center">
                <User size={16}/> Hasta
              </label>
              <PatientCombobox
                value={fields.hasta_id}
                setValue={id => setFields({ ...fields, hasta_id: id })}
                patients={patients}
              />
            </div>
            {/* Tarih */}
            <div className="col-span-full md:col-span-1">
              <label className="block text-blue-900 font-semibold mb-1 flex gap-1 items-center">
                <CalendarIcon size={16}/> İşlem Tarihi
              </label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 ring-offset-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition bg-white"
                value={fields.islem_tarihi}
                onChange={e => setFields({ ...fields, islem_tarihi: e.target.value })}
                required
              />
            </div>
            {/* Tür */}
            <div className="col-span-full md:col-span-1">
              <label className="block text-blue-900 font-semibold mb-1 flex gap-1 items-center">
                <FileText size={16}/> Tür
              </label>
              <NoteTypeRadio
                value={fields.tur}
                setValue={t => setFields({ ...fields, tur: t })}
              />
            </div>
            {/* İşlemler (MultiSelect) */}
            <div className="col-span-full md:col-span-1">
              <label className="block text-blue-900 font-semibold mb-1 flex gap-1 items-center">
                <FileText size={16}/> İşlem(ler)
              </label>
              <MultiSelectCombobox
                selected={fields.basliklar}
                setSelected={arr => setFields({ ...fields, basliklar: arr })}
                options={OPTIONS}
                placeholder="İşlem seç veya yeni ekle..."
              />
            </div>
            {/* Detay/Not alanı */}
            <div className="col-span-full">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-blue-900 font-semibold flex gap-1 items-center m-0">
                  <FileText size={16}/> Detay
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition cursor-pointer"
                  onClick={() => setDrawerOpen(true)}
                  title="Kayıtlı not şablonunu seç"
                >
                  <BookOpen size={16} className="text-indigo-500" />
                  Şablonlardan Seç
                </button>
              </div>
              <textarea
                className="w-full border rounded-lg px-3 py-3 outline-none bg-white min-h-[110px] shadow-sm resize-vertical ring-offset-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                placeholder="Detaylı not yazınız..."
                value={fields.not}
                maxLength={1200}
                onChange={e => setFields({ ...fields, not: e.target.value })}
                required
              />
            </div>
            {/* Kaydet Buton */}
            <div className="col-span-full pt-5">
              <button
                type="submit"
                className={clsx(
                  "w-full flex items-center gap-2 justify-center px-5 py-3 rounded-xl font-extrabold text-lg tracking-wide text-white bg-blue-800 hover:bg-blue-700 shadow-xl transition-all border-2 border-blue-900/10",
                  (!canSave || saving) && "opacity-60 pointer-events-none"
                )}
                disabled={!canSave || saving}
              >
                {saving ? <LoaderCircle size={22} className="animate-spin" /> : <Plus size={22} />} Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
      <NoteTemplateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tur={fields.tur}
        basliklar={fields.basliklar}
        textareaValue={fields.not}
        setTextareaValue={v => setFields((f: NewNoteFields) => ({ ...f, not: v }))}
      />
    </>
  );
}

// --- SKELETON KOPYALA ---
function SkeletonCard() {
  return (
    <div className="relative p-4 bg-white rounded-xl shadow-md animate-pulse min-h-[170px] flex flex-col">
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl bg-slate-200" />
      <div className="h-5 bg-slate-100 rounded w-1/2 mb-2 mt-2" />
      <div className="flex mb-2">
        <div className="h-4 bg-slate-200 rounded w-1/4 mr-2" />
        <div className="h-4 bg-slate-100 rounded w-1/4" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-1" />
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-5/12 mb-3" />
    </div>
  );
}

// --- CARD renkleri ---
const turColors: Record<string, string> = {
  "Ameliyat": "bg-red-500",
  "Klinik İşlem": "bg-blue-500"
};

// --- ANA SAYFA BİLEŞENİ ---
const AmeliyatIslemNotlariPage: React.FC = () => {
  // STATE
  const [islemNotlari, setIslemNotlari] = useState<IslemNotu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"Tümü" | "Ameliyat" | "Klinik İşlem">("Tümü");

  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<NewNoteFields>({
    hasta_id: null,
    basliklar: [],
    not: "",
    tur: "Ameliyat",
    islem_tarihi: "",
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- GRID responsive columns ---
  const [gridCols, setGridCols] = useState<number>(3);
  useEffect(() => {
    const handleResize = () => setGridCols(getGridCols());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- VERİLERİ ÇEK ---
  useEffect(() => {
    fetchData();
    fetchPatients();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("islem_notlari")
      .select("*, hastalar(id, ad_soyad)")
      .order("islem_tarihi", { ascending: false });
    if (!error) setIslemNotlari(data as IslemNotu[]);
    setLoading(false);
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from("hastalar")
      .select("id, ad_soyad")
      .order("ad_soyad");
    setPatients((data as Patient[]) ?? []);
  }

  // --- Filtre ve Arama ---
  const filteredList = useMemo(() => {
    return islemNotlari.filter((n: IslemNotu) => {
      if (filterType !== "Tümü" && n.tur !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLocaleLowerCase("tr-TR");
      const hasta = n.hastalar?.ad_soyad?.toLocaleLowerCase("tr-TR") ?? "";
      // başlık(lar)
      const basliklar = n.baslik
        ? n.baslik.toLocaleLowerCase("tr-TR")
        : "";
      return hasta.includes(q) || basliklar.includes(q);
    });
  }, [islemNotlari, searchQuery, filterType]);

  // --- NOT EKLEME ---
  const canSave =
    newNote.hasta_id &&
    newNote.basliklar.length > 0 &&
    newNote.not.length > 4 &&
    newNote.islem_tarihi;
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from("islem_notlari").insert({
      ...newNote,
      baslik: newNote.basliklar.join(","), // Veritabanı bir dize tutacak
    });
    setSaving(false);
    if (!error) {
      setAddModalOpen(false);
      setNewNote({
        hasta_id: null,
        basliklar: [],
        not: "",
        tur: "Ameliyat",
        islem_tarihi: "",
      });
      fetchData();
    }
  }

  // --- NOT SİLME ---
  async function handleDeleteNote(id: number) {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    setDeletingId(id);
    await supabase.from("islem_notlari").delete().eq("id", id);
    setDeletingId(null);
    fetchData();
  }

  // --- ANA RENDER ---
  return (
    <div className="max-w-6xl mx-auto px-3 py-8 min-h-screen bg-gradient-to-tr from-[#e4f3ff] to-[#f9fbff]">
      {/* Başlık ve ekle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-blue-900">
          <FileText size={34} className="text-blue-700" /> Ameliyat / İşlem Notları
        </h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-800 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold shadow-lg transition"
        >
          <Plus size={20} /> Yeni Not Ekle
        </button>
      </div>

      {/* Arama ve Filtreler */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center mb-8">
        <div className="flex-1 relative">
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
          <input
            type="text"
            placeholder="Hasta adı veya işlem başlığı ara..."
            className="pl-11 pr-3 py-2 w-full rounded-lg border border-blue-200 outline-none bg-slate-50 text-blue-900 focus:ring-2 focus:ring-blue-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            maxLength={50}
          />
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0 mt-2 md:mt-0">
          <button
            className={clsx(
              "flex gap-1 items-center px-4 py-2 rounded-lg font-semibold transition shadow",
              filterType === "Tümü"
                ? "bg-blue-800 text-white"
                : "bg-white text-blue-800 border border-blue-200"
            )}
            onClick={() => setFilterType("Tümü")}
          >
            <FileText size={16} /> Tümü
          </button>
          <button
            className={clsx(
              "flex gap-1 items-center px-4 py-2 rounded-lg font-semibold transition shadow",
              filterType === "Ameliyat"
                ? "bg-red-600 text-white"
                : "bg-white text-red-600 border border-red-200"
            )}
            onClick={() => setFilterType("Ameliyat")}
          >
            <FileText size={16} /> Ameliyat
          </button>
          <button
            className={clsx(
              "flex gap-1 items-center px-4 py-2 rounded-lg font-semibold transition shadow",
              filterType === "Klinik İşlem"
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-600 border border-blue-200"
            )}
            onClick={() => setFilterType("Klinik İşlem")}
          >
            <FileText size={16} /> Klinik İşlem
          </button>
        </div>
      </div>

      {/* Grid/Kart Listesi */}
      <div
        className={clsx(
          "grid gap-6",
          gridCols === 1 && "grid-cols-1",
          gridCols === 2 && "sm:grid-cols-2 grid-cols-1",
          gridCols === 3 && "lg:grid-cols-3 sm:grid-cols-2 grid-cols-1"
        )}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : (
            filteredList.length
              ? filteredList.map((not: IslemNotu) => (
                <div
                  className="relative group bg-white rounded-2xl shadow-md flex flex-col min-h-[175px] px-4 pt-5 pb-4"
                  key={not.id}
                >
                  {/* Sol renkli bar */}
                  <div className={clsx(
                    "absolute left-0 top-0 h-full w-2 rounded-l-2xl transition-colors",
                    turColors[not.tur] || "bg-slate-400"
                  )} />
                  {/* Üst bilgi */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-semibold text-blue-900 text-[1.08rem] truncate">
                      <User size={16} className="text-blue-400" />{not.hastalar?.ad_soyad || "-"}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(not.islem_tarihi)}</span>
                  </div>
                  {/* Başlıklar/işlemler chipler gibi */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(not.baslik ? not.baslik.split(",").map(b =>
                      <span
                        key={b}
                        className={clsx(
                          "inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold shadow-sm border",
                          not.tur === "Ameliyat"
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                      >{b}</span>
                    ) : <span className="text-gray-400">-</span>)}
                  </div>
                  {/* Not Özeti */}
                  <div className="text-gray-800 font-medium whitespace-pre-line mb-3 text-[0.98rem] leading-snug line-clamp-2" style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {truncateText(not.not, 2)}
                  </div>
                  <div className="flex justify-between items-end mt-auto">
                    <button
                      className={clsx(
                        "group flex items-center gap-1 text-blue-700 text-sm font-semibold cursor-pointer px-1 py-1 rounded hover:bg-blue-50"
                      )}
                      type="button"
                      onClick={e => { e.preventDefault(); alert("Detaylı okuma özelliği yakında!"); }}
                    >
                      Devamını Oku
                      <FileText size={15} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      className={clsx(
                        "p-2 rounded-full hover:bg-red-100 transition disabled:opacity-60",
                        deletingId === not.id && "pointer-events-none"
                      )}
                      title="Sil"
                      onClick={() => handleDeleteNote(not.id)}
                      disabled={deletingId === not.id}
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))
              : (
                <div className="col-span-full py-16 flex flex-col items-center text-blue-800 gap-4 opacity-70">
                  <FileText size={48} className="text-blue-300" />
                  <div className="text-lg font-semibold">Kayıt bulunamadı</div>
                </div>
              )
          )
        }
      </div>

      {/* Modal */}
      <NoteAddModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddNote}
        fields={newNote}
        setFields={setNewNote}
        patients={patients}
        saving={saving}
      />
    </div>
  );
};

export default AmeliyatIslemNotlariPage;
