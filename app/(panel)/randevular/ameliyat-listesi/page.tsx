"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Trash2,
  Check,
  X,
  LoaderCircle,
  Pencil,
  User,
  Clock3,
  Clipboard,
  Phone,
  Search,
  UserPlus,
  Syringe,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import FullCalendar from "@fullcalendar/react";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventInput, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";

// --------- Types ----------
type Appointment = {
  id: number;
  hasta_id: number;
  baslangic_tarihi: string;
  islem: string;
  notlar: string | null;
  durum?: string;
  created_at: string;
  hastalar?: {
    id: number;
    ad_soyad: string;
    telefon?: string;
  };
  tur?: string | null;
  secilen_islemler?: string[];
};

type Patient = {
  id: number;
  ad_soyad: string;
  telefon?: string;
  cinsiyet?: string | null;
};

interface QuickPatientForm {
  ad_soyad: string;
  telefon: string;
  cinsiyet: string;
}

const INITIAL_KLINIK_ISLEMLER = [
  "Botoks",
  "Dolgu",
  "Mezoterapi",
  "PRP",
  "Gençlik Aşısı",
  "Cilt Bakımı",
];
const INITIAL_AMELIYAT_ISLEMLER = [
  "Rinoplasti",
  "Meme Estetiği",
  "Liposuction",
  "Göz Kapağı",
  "Karın Germe",
];

const DURUM_COLOR: Record<string, string> = {
  "Onaylandı": "#3B82F6",
  "Bekliyor": "#FACC15",
  "İptal": "#EF4444",
};

function formatDateAndTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const gun = d.getDate().toString().padStart(2, "0");
  const ay = (d.getMonth() + 1).toString().padStart(2, "0");
  const yil = d.getFullYear();
  const saat = d.getHours().toString().padStart(2, "0");
  const dakika = d.getMinutes().toString().padStart(2, "0");
  return `${gun}.${ay}.${yil} ${saat}:${dakika}`;
}
function getDateAndTimeStr(iso: string) {
  if (!iso) return { tarih: "", saat: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { tarih: "", saat: "" };
  return {
    tarih: d.toISOString().slice(0, 10),
    saat: d.toISOString().slice(11, 16),
  };
}
function makeISODate(tarih: string, saat: string): string {
  if (!tarih || !saat) return "";
  return `${tarih}T${saat}:00`;
}

// ---- Modal ---- (değişmedi)
function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  zIndex = 50,
  blur = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  zIndex?: number;
  blur?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className={clsx(
        "fixed inset-0 flex items-center justify-center transition dark:bg-black/20",
        blur ? "bg-slate-900/60 backdrop-blur-[2.5px]" : "bg-slate-900/40 backdrop-blur-[2px]"
      )}
      style={{ zIndex }}
    >
      <div
        className={clsx(
          "bg-white rounded-xl shadow-2xl w-full relative animate-in fade-in",
          wide ? "max-w-xl" : "max-w-md"
        )}
        style={{ zIndex: zIndex + 1 }}
      >
        <div className="py-4 px-6 border-b flex items-center justify-between">
          <span className="font-semibold text-blue-700">{title}</span>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded transition"
            type="button"
            aria-label="Modalı Kapat"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Searchable Combobox Patient Picker --- (değişmedi)
function PatientCombobox({
  patients,
  value,
  onChange,
  disabled,
  loading,
  onAddNew,
}: {
  patients: Patient[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
  onAddNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (s: string) =>
    s
      .toLocaleLowerCase("tr-TR")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i");

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    return patients.filter((p) =>
      normalize(p.ad_soyad || "").includes(normalize(search))
    );
  }, [search, patients]);

  const selectedText =
    patients.find((p) => p.id.toString() === value)?.ad_soyad || "";

  function handleBlur() {
    setTimeout(() => setOpen(false), 200);
  }

  return (
    <div className="relative" tabIndex={-1} onBlur={handleBlur}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className={clsx(
              "w-full pl-8 pr-3 py-2 bg-white border rounded focus:outline-blue-500 transition",
              disabled && "opacity-70 pointer-events-none",
              "font-normal"
            )}
            placeholder="Hasta ara/ekle..."
            ref={inputRef}
            value={search || selectedText}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
              if (value && e.target.value === "") onChange("");
            }}
            onClick={() => setOpen(true)}
            autoComplete="off"
            spellCheck={false}
            type="search"
          />
        </div>
        {value && (
          <button
            type="button"
            className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-500 ml-1 hover:bg-slate-100 transition"
            onClick={() => {
              onChange("");
              setSearch("");
              inputRef.current?.focus();
            }}
            tabIndex={-1}
            aria-label="Seçimi Temizle"
            disabled={disabled}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-30 bg-white border rounded-lg mt-1 shadow-xl max-h-64 overflow-auto">
          {loading ? (
            <div className="text-center py-6 text-blue-600">
              <LoaderCircle className="animate-spin mx-auto mb-2" size={24} />
              Yükleniyor...
            </div>
          ) : (
            <>
              {filtered.length === 0 && (
                <div className="py-3 px-3 text-slate-400 flex items-center gap-2">
                  <User size={17} /> <span>Sonuç bulunamadı</span>
                </div>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={clsx(
                    "block w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 transition truncate",
                    value == p.id.toString()
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "text-slate-700"
                  )}
                  onMouseDown={() => {
                    onChange(p.id.toString());
                    setSearch(p.ad_soyad);
                    setOpen(false);
                  }}
                  tabIndex={0}
                >
                  <span className="flex items-center gap-2">
                    <User size={15} />
                    <span>{p.ad_soyad}</span>
                    {p.telefon && <span className="text-xs text-slate-400 ml-2">{p.telefon}</span>}
                  </span>
                </button>
              ))}
              <div className="border-t my-1 mb-0"></div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2 text-blue-700 hover:bg-blue-50 rounded-b"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setSearch("");
                  onAddNew();
                }}
              >
                <Plus size={17} />
                <span>+ Yeni Hasta Ekle</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Multi-Select Combobox for İşlem (değişmedi) ----
function MultiSelectIslemCombobox({
  options,
  setOptions,
  selected,
  setSelected,
  disabled,
  placeholder = "İşlem ara/seç...",
  type = "Klinik",
}: {
  options: string[];
  setOptions: (opts: string[]) => void;
  selected: string[];
  setSelected: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: "Klinik" | "Ameliyat";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (s: string) =>
    s
      .toLocaleLowerCase("tr-TR")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i");

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return options;
    }
    return options.filter((islem) => normalize(islem).includes(normalize(search)));
  }, [search, options]);

  function handleBlur() {
    setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(islem: string) {
    if (selected.includes(islem)) {
      setSelected(selected.filter((i) => i !== islem));
    } else {
      setSelected([...selected, islem]);
    }
  }

  function handleAddNewClick() {
    const newValue = search.trim();
    if (newValue && !options.some(opt => normalize(opt) === normalize(newValue))) {
      setOptions([...options, newValue]);
      setSelected([...selected, newValue]);
      setSearch("");
      setOpen(false);
      return;
    }
    if (!newValue) {
      const label = type === "Klinik" ? "Yeni Klinik İşlem Adı" : "Yeni Ameliyat Adı";
      const prom = window.prompt(label + " girin:");
      const girilen = prom && prom.trim();
      if (girilen && !options.some(opt => normalize(opt) === normalize(girilen))) {
        setOptions([...options, girilen]);
        setSelected([...selected, girilen]);
        setOpen(false);
      }
    }
  }

  const ekleButon =
    <div className="sticky bottom-0 bg-white border-t">
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2 text-blue-700 hover:bg-blue-50 rounded-b font-medium"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        onMouseDown={e => {
          e.preventDefault();
          handleAddNewClick();
        }}
      >
        <Plus size={17} />
        <span>
          {search.trim()
            ? (
              (options.some(opt => normalize(opt) === normalize(search.trim()))
                ? `Ekli (${search.trim()})`
                : `+ Yeni ${type === "Klinik" ? "İşlem" : "Ameliyat"} Ekle: "${search.trim()}"`)
            )
            : `+ Yeni ${type === "Klinik" ? "İşlem" : "Ameliyat"} Ekle`}
        </span>
      </button>
    </div>;
  return (
    <div className="relative mt-2" tabIndex={-1} onBlur={handleBlur}>
      <div
        className={clsx(
          "flex flex-wrap items-center min-h-[44px] border rounded py-1.5 px-2 bg-white focus-within:outline focus-within:outline-blue-500 transition cursor-pointer",
          disabled && "opacity-60 pointer-events-none",
          open && "ring-2 ring-blue-400"
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {selected.length > 0 &&
          selected.map((islem) => (
            <span key={islem} className="flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 mr-1 mb-1 text-sm font-medium border border-blue-200">
              {islem}
              <button
                tabIndex={-1}
                type="button"
                className="ml-1 p-0.5 focus:outline-none"
                aria-label="Kaldır"
                onClick={e => {
                  e.stopPropagation();
                  setSelected(selected.filter((i) => i !== islem));
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))
        }
        <input
          ref={inputRef}
          className="flex-1 min-w-[120px] border-0 focus:outline-none bg-transparent py-1 text-base placeholder:text-slate-400"
          placeholder={selected.length === 0 ? placeholder : ""}
          value={search}
          disabled={disabled}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-30 bg-white border rounded-lg mt-1 shadow-xl max-h-56 overflow-auto animate-in fade-in flex flex-col">
          {filtered.length === 0 ? (
            <div className="py-3 px-3 text-slate-400 flex items-center gap-2 text-sm">
              <Clipboard size={16} /> Sonuç bulunamadı
            </div>
          ) : (
            filtered.map((islem) => (
              <label
                key={islem}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 transition text-slate-700 font-normal",
                  selected.includes(islem) && "bg-blue-100 text-blue-700 font-semibold"
                )}
                onMouseDown={e => e.preventDefault()}
              >
                <input
                  type="checkbox"
                  className="form-checkbox accent-blue-600 h-4 w-4"
                  checked={selected.includes(islem)}
                  onChange={() => handleSelect(islem)}
                  tabIndex={-1}
                  disabled={disabled}
                />
                <span>{islem}</span>
              </label>
            ))
          )}
          {ekleButon}
        </div>
      )}
    </div>
  );
}

// ---- Hızlı Hasta Ekle Modal (değişmedi) ----
function QuickPatientModal({
  open,
  onClose,
  onSaved,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (createdPatient: Patient) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<QuickPatientForm>({
    ad_soyad: "",
    telefon: "",
    cinsiyet: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setForm({
        ad_soyad: "",
        telefon: "",
        cinsiyet: "",
      });
      setSaving(false);
      setError(null);
    }
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.ad_soyad.trim()) {
      setError("Ad Soyad zorunludur.");
      return;
    }
    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("hastalar")
      .insert([
        {
          ad_soyad: form.ad_soyad,
          telefon: form.telefon || null,
          cinsiyet: form.cinsiyet || null,
        },
      ])
      .select("id,ad_soyad,telefon,cinsiyet")
      .single();

    setSaving(false);
    if (!insertError && data) {
      onSaved(data as Patient);
      onClose();
    } else {
      setError(insertError?.message || "Hasta kaydedilemedi.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Hızlı Hasta Kaydı" wide zIndex={70} blur>
      <form className="p-6 flex flex-col gap-4" onSubmit={handleSave}>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium flex items-center gap-1">
            <UserPlus size={16} className="mr-1 text-blue-600" />
            Ad Soyad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full p-2 border rounded focus:outline-blue-500"
            value={form.ad_soyad}
            onChange={(e) => setForm((prev) => ({ ...prev, ad_soyad: e.target.value }))}
            maxLength={50}
            autoFocus
            placeholder="Hasta adı ve soyadı"
            disabled={saving || loading}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">
            Telefon
          </label>
          <input
            type="tel"
            className="w-full p-2 border rounded focus:outline-blue-500"
            value={form.telefon}
            onChange={(e) => setForm((prev) => ({ ...prev, telefon: e.target.value }))}
            maxLength={16}
            placeholder="05XX..."
            disabled={saving || loading}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">
            Cinsiyet
          </label>
          <select
            className="w-full p-2 border rounded focus:outline-blue-500 bg-white"
            value={form.cinsiyet}
            onChange={(e) => setForm((prev) => ({ ...prev, cinsiyet: e.target.value }))}
            disabled={saving || loading}
          >
            <option value="">Seçiniz</option>
            <option value="Kadın">Kadın</option>
            <option value="Erkek">Erkek</option>
            <option value="Belirtilmedi">Belirtilmedi</option>
          </select>
        </div>
        {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-slate-100 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
            disabled={saving || loading}
          >
            İptal
          </button>
          <button
            type="submit"
            className={clsx(
              "flex-1 py-2 font-medium rounded-lg transition text-white flex items-center justify-center gap-2",
              (saving || loading) ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 shadow-md"
            )}
            disabled={saving || loading}
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Yeni Ameliyat Ekle Modal ---- (özelleştirilmiş)
function AppointmentCreateModal({
  open,
  onClose,
  form,
  setForm,
  onSave,
  saving,
  error,
  patients,
  fromCalendar = false,
  onPatientAdded,
  loadingPatients,
  ameliyatIslemler,
  setAmeliyatIslemler,
}: {
  open: boolean;
  onClose: () => void;
  form: {
    hasta_id: string;
    tarih: string;
    saat: string;
    tur: string | null;
    secilen_islemler: string[];
    notlar: string;
    islem?: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  error: string | null;
  patients: Patient[];
  fromCalendar?: boolean;
  onPatientAdded: (patient: Patient) => Promise<void>;
  loadingPatients: boolean;
  ameliyatIslemler: string[];
  setAmeliyatIslemler: (y: string[]) => void;
}) {
  const [quickPatientOpen, setQuickPatientOpen] = useState(false);

  // Otomatik "Ameliyat" set etmek için, modal her açıldığında bir effect
  React.useEffect(() => {
    if (open && form.tur !== "Ameliyat") {
      setForm((prev: any) => ({
        ...prev,
        tur: "Ameliyat"
      }));
    }
    // eslint-disable-next-line
  }, [open]);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Yeni Ameliyat Oluştur" wide>
        <form className="p-6 flex flex-col gap-4" onSubmit={onSave} autoComplete="off">
          {/* Hasta ComboBox */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 font-medium flex items-center gap-1">
              <User size={15}/> Hasta{" "}
              <span className="text-red-500">*</span>
            </label>
            <PatientCombobox
              patients={patients}
              value={form.hasta_id}
              onChange={(val) => setForm((prev: any) => ({ ...prev, hasta_id: val }))}
              disabled={saving}
              loading={loadingPatients}
              onAddNew={() => setQuickPatientOpen(true)}
            />
          </div>
          {/* Tarih ve Saat */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1 font-medium">
                Tarih <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded focus:outline-blue-500"
                value={form.tarih}
                onChange={(e) => setForm((prev: any) => ({ ...prev, tarih: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1 font-medium">
                Saat <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                className="w-full p-2 border rounded focus:outline-blue-500"
                value={form.saat}
                onChange={(e) => setForm((prev: any) => ({ ...prev, saat: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>
          {/* İşlem Türü (Gizli/Disabled Alan) */}
          <input
            type="hidden"
            name="tur"
            value="Ameliyat"
          />
          <div>
            <label className="block text-xs text-slate-500 mb-2 font-medium">İşlem Türü</label>
            <div className="flex gap-4 mb-1">
              <button
                type="button"
                className={clsx(
                  "flex-1 flex items-center gap-2 px-0 py-3 rounded-xl border-2 text-lg font-semibold transition group justify-center shadow-sm opacity-60 pointer-events-none",
                  "border-slate-200 bg-white text-slate-400"
                )}
                aria-pressed={false}
                disabled
                tabIndex={-1}
              >
                <Syringe size={25} className="mr-2 transition" />
                Klinik İşlem
              </button>
              <button
                type="button"
                className={clsx(
                  "flex-1 flex items-center gap-2 px-0 py-3 rounded-xl border-2 text-lg font-semibold transition group justify-center shadow-sm",
                  "border-red-600 bg-red-50 text-red-700 cursor-default"
                )}
                aria-pressed={true}
                disabled
                tabIndex={-1}
              >
                <Activity size={24} className={clsx("mr-2 transition", "text-red-500")} />
                Ameliyat (Seçili)
              </button>
            </div>
            {/* Multi-Select Combobox (Sadece Ameliyat) */}
            <MultiSelectIslemCombobox
              options={ameliyatIslemler}
              setOptions={setAmeliyatIslemler}
              selected={form.secilen_islemler}
              setSelected={(arr) => setForm((prev: any) => ({ ...prev, secilen_islemler: arr }))}
              disabled={saving}
              placeholder="Ameliyat ara/seç..."
              type="Ameliyat"
            />
          </div>
          {/* Notlar */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 font-medium">Notlar</label>
            <textarea
              className="w-full p-2 border rounded focus:outline-blue-500"
              value={form.notlar}
              onChange={(e) => setForm((prev: any) => ({ ...prev, notlar: e.target.value }))}
              rows={2}
              disabled={saving}
              maxLength={200}
              placeholder="Varsa ek bilgi notu"
            />
          </div>
          {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              disabled={saving}
            >
              İptal
            </button>
            <button
              type="submit"
              className={clsx(
                "flex-1 py-2 font-medium rounded-lg transition text-white flex items-center justify-center gap-2",
                saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 shadow-md"
              )}
              disabled={saving}
            >
              <Check size={16} /> Kaydet
            </button>
          </div>
        </form>
      </Modal>
      <QuickPatientModal
        open={quickPatientOpen}
        onClose={() => setQuickPatientOpen(false)}
        onSaved={async (patient: Patient) => {
          await onPatientAdded(patient);
          setForm((prev: any) => ({ ...prev, hasta_id: patient.id.toString() }));
        }}
        loading={saving || loadingPatients}
      />
    </>
  );
}

// ---- Timeline/Liste Style Component (değişmedi) ----
function TimelineList({
  appointments,
  onDelete,
  deletingId,
}: {
  appointments: Appointment[];
  onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  return (
    <div className="p-3 md:p-7">
      <div className="flex flex-col gap-6 relative before:absolute before:top-0 before:bottom-0 before:left-5 before:w-1 before:bg-blue-100 before:rounded-lg before:z-0 md:before:left-7">
        {appointments.length === 0 ? (
          <div className="text-center text-slate-400 py-20">Henüz randevu yok.</div>
        ) : (
          appointments.map((r, idx) => (
            <div key={r.id} className="relative flex gap-4 items-center group">
              {/* Timeline indicator */}
              <div className="w-11 md:w-16 flex-shrink-0 flex flex-col items-center relative z-10">
                <div
                  className={clsx(
                    "w-5 h-5 flex items-center justify-center rounded-full ring-4 ring-white border-2 border-blue-400 bg-white shadow",
                    idx === 0 && "mt-2"
                  )}
                >
                  <Clock3 size={13} className="text-blue-600" />
                </div>
                <div className="h-full w-[2px] bg-blue-100"></div>
              </div>
              {/* Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg shadow transition flex-1 p-4 flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-5">
                  <div className="font-semibold text-blue-700 text-base flex items-center gap-2">
                    <User size={16} /> {r.hastalar?.ad_soyad || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm mt-1 md:mt-0">
                    <Clock3 size={14} />
                    {formatDateAndTime(r.baslangic_tarihi)}
                  </div>
                  <div className="text-sm flex items-center gap-1">
                    <Clipboard size={14} /> {r.islem}
                  </div>
                  {r.hastalar?.telefon && (
                    <div className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                      <Phone size={12} />
                      {r.hastalar.telefon}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "px-2 py-0.5 text-xs rounded border font-medium",
                      r.durum === "Onaylandı"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : r.durum === "Bekliyor"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    {r.durum || "Bekliyor"}
                  </span>
                  <button
                    className="p-2 hover:bg-red-100 transition text-red-700 border border-red-100 rounded disabled:opacity-40 ml-1"
                    onClick={() => onDelete(r.id)}
                    title="Randevuyu Sil"
                    disabled={deletingId === r.id}
                  >
                    {deletingId === r.id ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Detay/Düzenleme Modal (değişmedi; işlem türü radioları açık, değişiklik yok) ----------
function AppointmentDetailModal({
  open,
  onClose,
  appointment,
  onDelete,
  onUpdate,
  updating,
  deleting,
  patients,
}: {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  onDelete: () => Promise<void>;
  onUpdate: (formData: Partial<Appointment>) => Promise<void>;
  updating: boolean;
  deleting: boolean;
  patients: Patient[];
}) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<{
    hasta_id: string;
    tarih: string;
    saat: string;
    tur: string | null;
    secilen_islemler: string[];
    durum: string;
    notlar: string;
  }>({
    hasta_id: appointment?.hasta_id ? appointment.hasta_id + "" : "",
    tarih: getDateAndTimeStr(appointment?.baslangic_tarihi ?? "").tarih,
    saat: getDateAndTimeStr(appointment?.baslangic_tarihi ?? "").saat,
    tur: appointment?.tur ?? null,
    secilen_islemler: appointment?.secilen_islemler ?? (
      appointment?.islem && appointment.islem !== "İşlem Yok"
        ? appointment.islem.split(",").map(i => i.trim()).filter(Boolean)
        : []
    ),
    durum: appointment?.durum ?? "Bekliyor",
    notlar: appointment?.notlar ?? "",
  });

  React.useEffect(() => {
    if (appointment) {
      setForm({
        hasta_id: appointment?.hasta_id ? appointment.hasta_id + "" : "",
        tarih: getDateAndTimeStr(appointment.baslangic_tarihi ?? "").tarih,
        saat: getDateAndTimeStr(appointment.baslangic_tarihi ?? "").saat,
        tur: appointment.tur ?? null,
        secilen_islemler: appointment.secilen_islemler ??
          (appointment.islem && appointment.islem !== "İşlem Yok"
            ? appointment.islem.split(",").map(i => i.trim()).filter(Boolean)
            : []),
        durum: appointment.durum ?? "Bekliyor",
        notlar: appointment.notlar ?? "",
      });
      setEditMode(false);
    }
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const islemStr =
      form.secilen_islemler && form.secilen_islemler.length > 0
        ? form.secilen_islemler.join(", ")
        : "İşlem Yok";
    await onUpdate({
      hasta_id: Number(form.hasta_id),
      baslangic_tarihi: makeISODate(form.tarih, form.saat),
      tur: form.tur ?? null,
      secilen_islemler: form.secilen_islemler ?? [],
      islem: islemStr,
      durum: form.durum,
      notlar: form.notlar,
    });
    setEditMode(false);
  };

  if (!appointment) return null;
  return (
    <Modal open={open} onClose={onClose} title="Randevu Detayı" wide>
      <div className="p-5">
        {!editMode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-medium text-lg">
              <User size={18} />
              <span>{appointment.hastalar?.ad_soyad || "-"}</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1 text-sm text-slate-700">
                <Clock3 size={16} />
                <span>{formatDateAndTime(appointment.baslangic_tarihi)}</span>
              </div>
              {appointment.tur && (
                <div className="flex items-center gap-1 text-sm font-medium">
                  {appointment.tur === "Klinik" ? (
                    <>
                      <Syringe size={15} className="text-blue-500" /> Klinik İşlem
                    </>
                  ) : (
                    <>
                      <Activity size={15} className="text-red-500" /> Ameliyat
                    </>
                  )}
                </div>
              )}
              {appointment.secilen_islemler && appointment.secilen_islemler.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-blue-800 flex-wrap">
                  <Clipboard size={15} />
                  {appointment.secilen_islemler.map(islem => (
                    <span
                      key={islem}
                      className={clsx(
                        "px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 text-xs font-semibold mr-1 mb-0.5 border border-blue-100"
                      )}
                    >
                      {islem}
                    </span>
                  ))}
                </div>
              )}
              {(!appointment.secilen_islemler ||
                !appointment.secilen_islemler.length) &&
                appointment.islem && (
                  <div className="flex items-center gap-1 text-sm text-slate-700">
                    <Clipboard size={15} />
                    {appointment.islem}
                  </div>
                )}
              {appointment.hastalar?.telefon && (
                <div className="flex items-center gap-1 text-sm text-slate-700">
                  <Phone size={16} />
                  <span>{appointment.hastalar.telefon}</span>
                </div>
              )}
            </div>
            <div>
              <span
                className={clsx(
                  "inline-block px-2 py-1 rounded border text-xs font-semibold",
                  appointment.durum === "Onaylandı"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : appointment.durum === "Bekliyor"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                {appointment.durum || "Bekliyor"}
              </span>
            </div>
            {appointment.notlar && (
              <div className="text-slate-600 bg-slate-50 p-2 rounded">{appointment.notlar}</div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setEditMode(true)}
                className="flex-1 flex items-center gap-2 justify-center py-2 rounded bg-blue-50 text-blue-600 border border-blue-100 font-medium hover:bg-blue-100 transition"
              >
                <Pencil size={16} /> Düzenle
              </button>
              <button
                onClick={onDelete}
                className={clsx(
                  "flex-1 flex items-center gap-2 justify-center py-2 rounded bg-red-50 text-red-700 border border-red-100 font-medium hover:bg-red-100 transition",
                  deleting && "opacity-70"
                )}
                disabled={deleting}
              >
                {deleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Sil
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">
                Hasta <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-2 border rounded focus:outline-blue-500 bg-white"
                required
                value={form.hasta_id}
                onChange={(e) => setForm((prev) => ({ ...prev, hasta_id: e.target.value }))}
                disabled={updating}
              >
                <option value="">Hasta seçiniz...</option>
                {patients.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.ad_soyad}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Tarih <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border rounded focus:outline-blue-500"
                  value={form.tarih}
                  onChange={(e) => setForm((prev) => ({ ...prev, tarih: e.target.value }))}
                  disabled={updating}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Saat <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  className="w-full p-2 border rounded focus:outline-blue-500"
                  value={form.saat}
                  onChange={(e) => setForm((prev) => ({ ...prev, saat: e.target.value }))}
                  disabled={updating}
                />
              </div>
            </div>
            {/* İşlem türü radio cardlar */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 font-medium">İşlem Türü</label>
              <div className="flex gap-4 mb-1">
                <button
                  type="button"
                  className={clsx(
                    "flex-1 flex items-center gap-2 px-0 py-3 rounded-xl border-2 text-lg font-semibold transition group justify-center shadow-sm",
                    form.tur === "Klinik"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                  )}
                  aria-pressed={form.tur === "Klinik"}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      tur: prev.tur === "Klinik" ? null : "Klinik",
                      secilen_islemler: [],
                    }))
                  }
                  disabled={updating}
                  tabIndex={0}
                >
                  <Syringe size={25} className={clsx("mr-2 transition", form.tur === "Klinik" && "text-blue-500")} />
                  Klinik İşlem
                </button>
                <button
                  type="button"
                  className={clsx(
                    "flex-1 flex items-center gap-2 px-0 py-3 rounded-xl border-2 text-lg font-semibold transition group justify-center shadow-sm",
                    form.tur === "Ameliyat"
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-red-300"
                  )}
                  aria-pressed={form.tur === "Ameliyat"}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      tur: prev.tur === "Ameliyat" ? null : "Ameliyat",
                      secilen_islemler: [],
                    }))
                  }
                  disabled={updating}
                  tabIndex={0}
                >
                  <Activity size={24} className={clsx("mr-2 transition", form.tur === "Ameliyat" && "text-red-500")} />
                  Ameliyat
                </button>
              </div>
              {form.tur === "Klinik" && (
                <MultiSelectIslemCombobox
                  options={INITIAL_KLINIK_ISLEMLER}
                  setOptions={() => {}}
                  selected={form.secilen_islemler}
                  setSelected={arr => setForm(prev => ({ ...prev, secilen_islemler: arr }))}
                  disabled={updating}
                  placeholder="Klinik işlem ara/seç..."
                  type="Klinik"
                />
              )}
              {form.tur === "Ameliyat" && (
                <MultiSelectIslemCombobox
                  options={INITIAL_AMELIYAT_ISLEMLER}
                  setOptions={() => {}}
                  selected={form.secilen_islemler}
                  setSelected={arr => setForm(prev => ({ ...prev, secilen_islemler: arr }))}
                  disabled={updating}
                  placeholder="Ameliyat ara/seç..."
                  type="Ameliyat"
                />
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">
                Durum <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-2 border rounded focus:outline-blue-500 bg-white"
                required
                value={form.durum}
                onChange={(e) => setForm((prev) => ({ ...prev, durum: e.target.value }))}
                disabled={updating}
              >
                <option value="Bekliyor">Bekliyor</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="İptal">İptal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Notlar</label>
              <textarea
                className="w-full p-2 border rounded focus:outline-blue-500"
                value={form.notlar}
                onChange={(e) => setForm((prev) => ({ ...prev, notlar: e.target.value }))}
                rows={2}
                disabled={updating}
                maxLength={200}
                placeholder="Varsa ek bilgi notu"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 border border-slate-100 bg-white text-slate-700 rounded-lg font-medium py-2 hover:bg-slate-50 transition"
                disabled={updating}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className={clsx(
                  "flex-1 py-2 font-medium rounded-lg transition text-white flex items-center justify-center gap-2",
                  updating ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 shadow-md"
                )}
                disabled={updating}
              >
                {updating ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Kaydet
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ----- Main Page -----
export default function AmeliyatListesiPage() {
  // ------ STATES ------
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [view, setView] = useState<"liste" | "takvim">("takvim");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFromCalendar, setModalFromCalendar] = useState(false);
  const [form, setForm] = useState<{
    hasta_id: string;
    tarih: string;
    saat: string;
    tur: string | null;
    secilen_islemler: string[];
    notlar: string;
    islem?: string;
  }>({
    hasta_id: "",
    tarih: "",
    saat: "",
    tur: "Ameliyat",
    secilen_islemler: [],
    notlar: "",
    islem: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // -- Dinamik Ameliyat işlemleri
  const [ameliyatIslemler, setAmeliyatIslemler] = useState<string[]>(() => INITIAL_AMELIYAT_ISLEMLER.slice());

  // Detay/Düzenleme modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState(false);

  // ---------- FETCH functions ----------
  async function fetchRandevular() {
    setLoading(true);
    const { data, error } = await supabase
      .from("randevular")
      .select("*, hastalar(id, ad_soyad, telefon)")
      .eq("tur", "Ameliyat")
      .order("baslangic_tarihi", { ascending: false });
    setLoading(false);
    if (!error && data) setRandevular(data as Appointment[]);
  }
  async function fetchPatients() {
    setLoadingPatients(true);
    const { data, error } = await supabase
      .from("hastalar")
      .select("id, ad_soyad, telefon, cinsiyet")
      .order("ad_soyad", { ascending: true });
    setLoadingPatients(false);
    if (!error && data) setPatients(data as Patient[]);
  }

  React.useEffect(() => {
    fetchRandevular();
    fetchPatients();
  }, []);

  // --- Ameliyat Ekle (INSERT: gereksinim formatı) ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.hasta_id || !form.tarih || !form.saat) {
      setError("Lütfen zorunlu tüm alanları doldurun.");
      return;
    }

    // Kayıt için uygun alanları hazırla
    const turValue = "Ameliyat";
    const secilenIslemlerArr = form.secilen_islemler ?? [];
    const islemStr =
      secilenIslemlerArr.length > 0 ? secilenIslemlerArr.join(", ") : "İşlem Yok";

    setSaving(true);

    const kayit = {
      hasta_id: Number(form.hasta_id),
      baslangic_tarihi: makeISODate(form.tarih, form.saat),
      tur: turValue,
      secilen_islemler: secilenIslemlerArr,
      islem: islemStr,
      notlar: form.notlar,
      durum: "Bekliyor",
    };

    const { data, error: saveErr } = await supabase
      .from("randevular")
      .insert([kayit])
      .select("*, hastalar(id, ad_soyad, telefon)")
      .single();

    setSaving(false);
    if (!saveErr && data) {
      await fetchRandevular();
      setModalOpen(false);
      setModalFromCalendar(false);
      setForm({
        hasta_id: "",
        tarih: "",
        saat: "",
        tur: "Ameliyat",
        secilen_islemler: [],
        notlar: "",
        islem: "",
      });
    } else {
      setError(saveErr?.message || "Kayıt başarısız.");
    }
  }

  // --- Ameliyat Sil
  async function handleDelete(id: number) {
    if (!window.confirm("Bu ameliyatı silmek istediğinize emin misiniz?")) return;
    setDeletingId(id);
    await supabase.from("randevular").delete().eq("id", id);
    setDeletingId(null);
    setRandevular((prev) => prev.filter((r) => r.id !== id));
  }

  // --- Detay Modalında Sil
  async function handleDetailDelete(appointment: Appointment | null) {
    if (!appointment) return;
    if (!window.confirm("Bu ameliyatı silmek istediğinize emin misiniz?")) return;
    setDeletingDetail(true);
    await supabase.from("randevular").delete().eq("id", appointment.id);
    setDeletingDetail(false);
    setDetailModalOpen(false);
    setSelectedAppointment(null);
    await fetchRandevular();
  }

  // --- Detay Modalında Edit/Update ---
  async function handleDetailUpdate(formData: Partial<Appointment>) {
    if (!selectedAppointment) return;
    setEditing(true);
    const updateInput = { ...formData };
    delete (updateInput as any).created_at;
    delete (updateInput as any).id;
    const { error: updErr } = await supabase
      .from("randevular")
      .update(updateInput)
      .eq("id", selectedAppointment.id);
    if (!updErr) {
      await fetchRandevular();
      setDetailModalOpen(false);
      setSelectedAppointment(null);
    }
    setEditing(false);
  }

  // --- Quick Patient Modal + Liste Güncelleme
  async function handlePatientAdded(newPatient: Patient) {
    await fetchPatients();
    setForm((prev) => ({ ...prev, hasta_id: newPatient.id.toString() }));
  }

  // --- Memoized Sorted
  const sortedAppointments = useMemo(() => {
    return [...randevular].sort((a, b) => {
      const dateA = new Date(a.baslangic_tarihi).getTime();
      const dateB = new Date(b.baslangic_tarihi).getTime();
      return dateA - dateB;
    });
  }, [randevular]);

  // --- Calendar Events Mapping ---
  const calendarEvents: EventInput[] = useMemo(() => {
    return randevular.map((appt) => {
      const start = appt.baslangic_tarihi;
      const endObj = new Date(start);
      endObj.setHours(endObj.getHours() + 1);
      const end = endObj.toISOString().slice(0, 16);
      return {
        id: appt.id.toString(),
        title: `${appt.hastalar?.ad_soyad ?? "-"}${
          (appt.secilen_islemler && appt.secilen_islemler.length)
            ? " - " + appt.secilen_islemler.join(", ")
            : (appt.islem ? " - " + appt.islem : "")
        }`,
        start,
        end,
        extendedProps: { ...appt },
        backgroundColor: DURUM_COLOR[appt.durum ?? "Bekliyor"] || "#3B82F6",
        borderColor: "#3B82F6",
        textColor: "#233A59",
      } as EventInput;
    });
  }, [randevular]);

  // --- Calendar Handlers ---
  function handleEventClick(arg: EventClickArg) {
    const aid = Number(arg.event.id);
    const selected = randevular.find((r) => r.id === aid);
    setSelectedAppointment(selected ?? null);
    setDetailModalOpen(true);
  }
  function handleDateSelect(arg: DateSelectArg) {
    const selDate = arg.startStr.slice(0, 10);
    const selStartTime = arg.startStr.slice(11, 16);
    setForm((prev) => ({
      ...prev,
      tarih: selDate,
      saat: selStartTime,
      tur: "Ameliyat",
      secilen_islemler: [],
      islem: "",
      notlar: "",
    }));
    setModalFromCalendar(true);
    setModalOpen(true);
  }
  async function handleEventDrop(arg: EventDropArg) {
    const aid = Number(arg.event.id);
    const newStart = arg.event.start;
    if (!newStart) return;
    const yeniIso = newStart.toISOString().slice(0, 16);
    await supabase
      .from("randevular")
      .update({
        baslangic_tarihi: yeniIso,
      })
      .eq("id", aid);
    await fetchRandevular();
  }
  function renderEventContent(eventInfo: EventContentArg) {
    const appt: any = eventInfo.event.extendedProps;
    const color = DURUM_COLOR[appt.durum ?? "Bekliyor"] || "#3B82F6";
    return (
      <div
        className="flex items-center rounded-lg shadow-sm"
        style={{ borderLeft: `6px solid ${color}`, background: "#fff", minHeight: 32 }}
      >
        <div className="flex items-center px-2 py-1 gap-2 text-sm font-medium text-blue-800">
          <User size={13} />
          <span className="truncate">{eventInfo.event.title}</span>
        </div>
      </div>
    );
  }

  // ----------- CUSTOM CALENDAR CSS (Google Style) -----------
  React.useEffect(() => {
    const id = "__fc-google-theme";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      .fc .fc-scrollgrid,
      .fc-theme-standard .fc-scrollgrid,
      .fc .fc-scrollgrid-section,
      .fc .fc-scrollgrid-sync-table,
      .fc .fc-daygrid-day,
      .fc .fc-timegrid-slot,
      .fc .fc-col-header-cell {
        border-color: #e2e8f0 !important; /* slate-100 */
      }
      .fc .fc-day-today, .fc-theme-standard .fc-day-today {
        background: #e0edff !important;
        border-radius: 0.55em;
        box-shadow: 0 0 0 2px #3B82F622;
      }
      .fc .fc-daygrid-event, .fc .fc-timegrid-event, .fc-event-main, .fc-v-event {
        border-radius: 0.5em !important;
        box-shadow:0 0.5px 1.5px #0051b10a;
      }
      .fc-event-title, .fc-event-main {
        font-weight: 600; font-size: 15px;
      }
      .fc-v-event.fc-event-start, .fc-v-event.fc-event-end { margin:2px; }
      .fc .fc-toolbar-title { font-size: 1.2rem; font-weight: 600; color: #1e3a8a;}
      .fc .fc-button { background: #bfdcff; color: #1e3a8a;  border: none; border-radius: 0.6em; transition: background .14s; }
      .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active, .fc .fc-button-primary:not(:disabled):focus {
        background: #3b82f6; color: #fff; box-shadow:0 1px 3px #3b82f622;
      }
      .fc .fc-button-primary:not(:disabled):hover { background: #2563eb; color:#fff;}
      .fc .fc-today-button { background: #3b82f6; color: #fff;}
      .fc .fc-daygrid-day-number { font-weight: 500; color:#1e293b; }
      .fc .fc-timegrid-axis, .fc .fc-col-header-cell { font-size: 15px; color: #64748b;}
      .fc .fc-event-time { color: #1e3a8a; }
      .fc .fc-daygrid-event, .fc .fc-timegrid-event { outline: none !important; }
      .fc .fc-day-today .fc-daygrid-day-number { font-weight: 700; color: #2563eb; background: #fff5; border-radius: 2em;}
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-1 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700 tracking-tight">
            Ameliyat Listesi
          </h1>
          <div className="text-slate-500 text-sm mt-1 font-normal">
            Planlanmış cerrahi operasyonları buradan yönetin.
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="rounded-xl bg-slate-50 px-1.5 py-1 flex gap-1 mr-3 border border-slate-100">
            <button
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 text-sm",
                view === "liste"
                  ? "bg-blue-600 text-white shadow"
                  : "text-blue-700 hover:bg-slate-100"
              )}
              onClick={() => setView("liste")}
              type="button"
            >
              <ListIcon size={15} /> Liste
            </button>
            <button
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 text-sm",
                view === "takvim"
                  ? "bg-blue-600 text-white shadow"
                  : "text-blue-700 hover:bg-slate-100"
              )}
              onClick={() => setView("takvim")}
              type="button"
            >
              <CalendarIcon size={15} /> Takvim
            </button>
          </div>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md transition text-sm"
            onClick={() => {
              setModalOpen(true);
              setModalFromCalendar(false);
              setForm({
                hasta_id: "",
                tarih: "",
                saat: "",
                tur: "Ameliyat",
                secilen_islemler: [],
                notlar: "",
                islem: "",
              });
            }}
            type="button"
          >
            <Plus size={18} />
            <span>+ Yeni Ameliyat</span>
          </button>
        </div>
      </div>
      {/* Main Body */}
      <div className="bg-white rounded-xl shadow border overflow-x-auto min-h-[450px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-blue-600">
            <LoaderCircle size={36} className="animate-spin mb-3" />
            <div>Yükleniyor...</div>
          </div>
        ) : view === "takvim" ? (
          <div className="p-2 md:p-8 rounded-xl">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Bugün",
                month: "Ay",
                week: "Hafta",
                day: "Gün",
              }}
              locale={trLocale}
              slotMinTime="08:00:00"
              slotMaxTime="22:00:00"
              height="auto"
              selectable
              selectMirror
              select={handleDateSelect}
              events={calendarEvents}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              editable
              dragScroll
              dayMaxEventRows={4}
              nowIndicator
              displayEventEnd={true}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              eventClassNames="hover:ring-2 ring-blue-300 focus:outline-none cursor-pointer transition"
              slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            />
          </div>
        ) : (
          <TimelineList
            appointments={sortedAppointments}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
      </div>
      {/* --- Yeni Ameliyat Modal --- */}
      <AppointmentCreateModal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
          setModalFromCalendar(false);
        }}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
        error={error}
        patients={patients}
        fromCalendar={modalFromCalendar}
        onPatientAdded={handlePatientAdded}
        loadingPatients={loadingPatients}
        ameliyatIslemler={ameliyatIslemler}
        setAmeliyatIslemler={setAmeliyatIslemler}
      />
      {/* --- Appointment Detay/Düzenleme Modal --- */}
      <AppointmentDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onDelete={() => handleDetailDelete(selectedAppointment)}
        onUpdate={handleDetailUpdate}
        updating={editing}
        deleting={deletingDetail}
        patients={patients}
      />
    </div>
  );
}
