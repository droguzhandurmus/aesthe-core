"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Building2, Clock, Users, Plus, Edit2, Trash2, X, Save,
  CheckCircle, AlertCircle, Copy, Check, Shield, DollarSign, User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type MainTab = "profil" | "calisma" | "personel";
type PersonelModalTab = "bilgiler" | "mali" | "yetkiler";
type Yetki = "tam" | "goruntule" | "yok";
type Rol = "Doktor" | "Hemşire" | "Resepsiyonist" | "Asistan" | "Muhasebeci" | "Stajyer";

interface KlinikProfil {
  klinik_adi: string;
  uzmanlik: string;
  adres: string;
  sehir: string;
  telefon: string;
  email: string;
  website: string;
  instagram: string;
  whatsapp: string;
  vergi_no: string;
  calisma_baslangic: string;
  calisma_bitis: string;
  calisma_gunleri: string[];
  randevu_suresi_dk: number;
}

interface Personel {
  id: string;
  ad_soyad: string;
  email: string;
  telefon: string;
  rol: Rol;
  maas: number;
  prim_yuzdesi: number;
  sgk_dahil: boolean;
  is_gunleri: string[];
  is_baslangic: string;
  is_bitis: string;
  yetkiler: Record<string, Yetki>;
  aktif: boolean;
  notlar: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MODULS = [
  { key: "genel_bakis", label: "Genel Bakış", desc: "Dashboard ve özet kartlar" },
  { key: "randevular", label: "Randevular", desc: "Takvim ve randevu yönetimi" },
  { key: "hastalar", label: "Hastalar", desc: "Hasta listesi ve kayıtları" },
  { key: "tibbi_kayitlar", label: "Tıbbi Kayıtlar", desc: "Ameliyat notları ve fotoğraflar" },
  { key: "finans", label: "Finans", desc: "Gelir, gider ve raporlar" },
  { key: "raporlar", label: "İstatistikler", desc: "Analitik ve performans raporları" },
  { key: "stok", label: "Stok Takibi", desc: "Ürün ve malzeme yönetimi" },
  { key: "hasta_portali", label: "Hasta Portali", desc: "Yorumlar ve sadakat programı" },
  { key: "ayarlar", label: "Ayarlar", desc: "Sistem ve klinik ayarları" },
];

const DEFAULT_PERMISSIONS: Record<Rol, Record<string, Yetki>> = {
  Doktor: {
    genel_bakis: "tam", randevular: "tam", hastalar: "tam", tibbi_kayitlar: "tam",
    finans: "goruntule", raporlar: "goruntule", stok: "goruntule", hasta_portali: "goruntule", ayarlar: "yok",
  },
  Hemşire: {
    genel_bakis: "goruntule", randevular: "tam", hastalar: "tam", tibbi_kayitlar: "goruntule",
    finans: "yok", raporlar: "yok", stok: "goruntule", hasta_portali: "goruntule", ayarlar: "yok",
  },
  Resepsiyonist: {
    genel_bakis: "tam", randevular: "tam", hastalar: "tam", tibbi_kayitlar: "yok",
    finans: "yok", raporlar: "yok", stok: "goruntule", hasta_portali: "tam", ayarlar: "yok",
  },
  Asistan: {
    genel_bakis: "goruntule", randevular: "goruntule", hastalar: "goruntule", tibbi_kayitlar: "yok",
    finans: "yok", raporlar: "yok", stok: "yok", hasta_portali: "yok", ayarlar: "yok",
  },
  Muhasebeci: {
    genel_bakis: "goruntule", randevular: "yok", hastalar: "yok", tibbi_kayitlar: "yok",
    finans: "tam", raporlar: "tam", stok: "goruntule", hasta_portali: "yok", ayarlar: "yok",
  },
  Stajyer: {
    genel_bakis: "goruntule", randevular: "goruntule", hastalar: "yok", tibbi_kayitlar: "yok",
    finans: "yok", raporlar: "yok", stok: "yok", hasta_portali: "yok", ayarlar: "yok",
  },
};

const GUNLER = [
  { key: "Pazartesi", short: "Pzt" },
  { key: "Salı", short: "Sal" },
  { key: "Çarşamba", short: "Çar" },
  { key: "Perşembe", short: "Per" },
  { key: "Cuma", short: "Cum" },
  { key: "Cumartesi", short: "Cmt" },
  { key: "Pazar", short: "Paz" },
];

const RANDEVU_SURELER = [10, 15, 20, 30, 45, 60, 90];
const UZMANLIKLAR = ["Plastik Cerrahi", "Estetik Cerrahi", "Dermatoloji", "Diş Hekimliği", "Göz Hastalıkları", "Diğer"];

const ROL_RENK: Record<Rol, string> = {
  Doktor: "bg-blue-100 text-blue-700",
  Hemşire: "bg-violet-100 text-violet-700",
  Resepsiyonist: "bg-emerald-100 text-emerald-700",
  Asistan: "bg-amber-100 text-amber-700",
  Muhasebeci: "bg-rose-100 text-rose-700",
  Stajyer: "bg-slate-100 text-slate-600",
};

const EMPTY_PROFIL: KlinikProfil = {
  klinik_adi: "", uzmanlik: "", adres: "", sehir: "",
  telefon: "", email: "", website: "", instagram: "",
  whatsapp: "", vergi_no: "",
  calisma_baslangic: "09:00", calisma_bitis: "18:00",
  calisma_gunleri: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
  randevu_suresi_dk: 30,
};

const EMPTY_PERSONEL: Omit<Personel, "id"> = {
  ad_soyad: "", email: "", telefon: "", rol: "Doktor",
  maas: 0, prim_yuzdesi: 0, sgk_dahil: true,
  is_gunleri: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
  is_baslangic: "09:00", is_bitis: "18:00",
  yetkiler: DEFAULT_PERMISSIONS["Doktor"],
  aktif: true, notlar: "",
};

const SQL_SCRIPT = `CREATE TABLE IF NOT EXISTS klinik_profil (
  id text PRIMARY KEY DEFAULT 'default',
  klinik_adi text DEFAULT '', uzmanlik text DEFAULT '',
  adres text DEFAULT '', sehir text DEFAULT '',
  telefon text DEFAULT '', email text DEFAULT '',
  website text DEFAULT '', instagram text DEFAULT '',
  whatsapp text DEFAULT '', vergi_no text DEFAULT '',
  calisma_baslangic text DEFAULT '09:00',
  calisma_bitis text DEFAULT '18:00',
  calisma_gunleri text[] DEFAULT '{}',
  randevu_suresi_dk integer DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE klinik_profil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_klinik" ON klinik_profil FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS personeller (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_soyad text NOT NULL, email text DEFAULT '',
  telefon text DEFAULT '', rol text DEFAULT 'Doktor',
  maas numeric DEFAULT 0, prim_yuzdesi numeric DEFAULT 0,
  sgk_dahil boolean DEFAULT true,
  is_gunleri text[] DEFAULT '{}',
  is_baslangic text DEFAULT '09:00', is_bitis text DEFAULT '18:00',
  yetkiler jsonb DEFAULT '{}',
  aktif boolean DEFAULT true, notlar text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE personeller ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_personel" ON personeller FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeOptions() {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    opts.push(`${String(h).padStart(2, "0")}:00`);
    opts.push(`${String(h).padStart(2, "0")}:30`);
  }
  return opts;
}

function timeDiffHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function KlinikAyarlariPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("profil");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [tablesMissing, setTablesMissing] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [profil, setProfil] = useState<KlinikProfil>(EMPTY_PROFIL);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [personelLoading, setPersonelLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<PersonelModalTab>("bilgiler");
  const [editingPersonel, setEditingPersonel] = useState<Personel | null>(null);
  const [personelForm, setPersonelForm] = useState<Omit<Personel, "id">>(EMPTY_PERSONEL);
  const [personelSaving, setPersonelSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const times = timeOptions();

  const loadProfil = useCallback(async () => {
    const { data, error } = await supabase
      .from("klinik_profil").select("*").eq("id", "default").maybeSingle();
    if (error) {
      if ((error as { code?: string }).code === "42P01") setTablesMissing(true);
      return;
    }
    if (data) setProfil({ ...EMPTY_PROFIL, ...data });
  }, []);

  const loadPersoneller = useCallback(async () => {
    setPersonelLoading(true);
    const { data, error } = await supabase
      .from("personeller").select("*").order("created_at", { ascending: true });
    if (error) {
      if ((error as { code?: string }).code === "42P01") setTablesMissing(true);
    } else {
      setPersoneller((data || []) as Personel[]);
    }
    setPersonelLoading(false);
  }, []);

  useEffect(() => { loadProfil(); loadPersoneller(); }, [loadProfil, loadPersoneller]);

  const saveProfil = async () => {
    setSaving(true); setSaveStatus("idle");
    const { error } = await supabase.from("klinik_profil")
      .upsert({ id: "default", ...profil, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaveStatus(error ? "error" : "success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const toggleGun = (gun: string) => {
    setProfil((p) => ({
      ...p,
      calisma_gunleri: p.calisma_gunleri.includes(gun)
        ? p.calisma_gunleri.filter((g) => g !== gun)
        : [...p.calisma_gunleri, gun],
    }));
  };

  const toggleIsGun = (gun: string) => {
    setPersonelForm((f) => ({
      ...f,
      is_gunleri: f.is_gunleri.includes(gun)
        ? f.is_gunleri.filter((g) => g !== gun)
        : [...f.is_gunleri, gun],
    }));
  };

  const openAddModal = () => {
    setEditingPersonel(null);
    setPersonelForm(EMPTY_PERSONEL);
    setModalTab("bilgiler");
    setModalOpen(true);
  };

  const openEditModal = (p: Personel) => {
    setEditingPersonel(p);
    setPersonelForm({ ...p });
    setModalTab("bilgiler");
    setModalOpen(true);
  };

  const handleRolChange = (rol: Rol) => {
    setPersonelForm((f) => ({ ...f, rol, yetkiler: DEFAULT_PERMISSIONS[rol] }));
  };

  const handleYetki = (key: string, val: Yetki) => {
    setPersonelForm((f) => ({ ...f, yetkiler: { ...f.yetkiler, [key]: val } }));
  };

  const savePersonel = async () => {
    if (!personelForm.ad_soyad.trim()) return;
    setPersonelSaving(true);
    if (editingPersonel) {
      await supabase.from("personeller").update(personelForm).eq("id", editingPersonel.id);
    } else {
      await supabase.from("personeller").insert(personelForm);
    }
    setPersonelSaving(false);
    setModalOpen(false);
    loadPersoneller();
  };

  const deletePersonel = async (id: string) => {
    await supabase.from("personeller").delete().eq("id", id);
    setDeleteConfirm(null);
    loadPersoneller();
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const dailyHours = timeDiffHours(profil.calisma_baslangic, profil.calisma_bitis);
  const dailySlots = profil.randevu_suresi_dk > 0
    ? Math.floor((dailyHours * 60) / profil.randevu_suresi_dk) : 0;

  const sgkKesinti = personelForm.sgk_dahil ? personelForm.maas * 0.15 : 0;
  const netMaas = personelForm.maas - sgkKesinti;
  const primTahmini = personelForm.maas * (personelForm.prim_yuzdesi / 100);
  const toplamMaliyet = personelForm.maas + primTahmini;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Klinik Ayarları</h1>
          <p className="text-sm text-slate-500">Klinik profili, çalışma düzeni ve personel yönetimi</p>
        </div>
      </div>

      {/* Setup Banner */}
      {tablesMissing && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Veritabanı tabloları oluşturulmamış</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Aşağıdaki SQL komutunu Supabase Dashboard → SQL Editor&apos;a yapıştırıp çalıştırın.
              </p>
            </div>
          </div>
          <button onClick={() => setShowSql((v) => !v)} className="text-sm font-medium text-amber-700 underline mb-3">
            {showSql ? "Kodu Gizle" : "SQL Kodunu Göster"}
          </button>
          {showSql && (
            <div className="relative">
              <pre className="bg-slate-900 text-green-300 text-xs rounded-xl p-4 overflow-x-auto max-h-60">{SQL_SCRIPT}</pre>
              <button onClick={copySql} className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
                {sqlCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 mb-6 w-fit gap-1">
        {([
          { key: "profil" as MainTab, label: "Klinik Profili", icon: Building2 },
          { key: "calisma" as MainTab, label: "Çalışma Düzeni", icon: Clock },
          { key: "personel" as MainTab, label: "Personel & Yetkiler", icon: Users },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── TAB: KLİNİK PROFİLİ ── */}
      {activeTab === "profil" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-3xl">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Klinik Bilgileri</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Klinik Adı *</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profil.klinik_adi}
                onChange={(e) => setProfil((p) => ({ ...p, klinik_adi: e.target.value }))}
                placeholder="Örn: Durmuş Estetik Kliniği"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Uzmanlık Alanı</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={profil.uzmanlik}
                onChange={(e) => setProfil((p) => ({ ...p, uzmanlik: e.target.value }))}
              >
                <option value="">Seçin...</option>
                {UZMANLIKLAR.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Şehir</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profil.sehir}
                onChange={(e) => setProfil((p) => ({ ...p, sehir: e.target.value }))}
                placeholder="İstanbul"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Adres</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                value={profil.adres}
                onChange={(e) => setProfil((p) => ({ ...p, adres: e.target.value }))}
                placeholder="Mahalle, cadde, sokak, bina no..."
              />
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">İletişim</p>
            </div>
            {[
              { field: "telefon" as keyof KlinikProfil, label: "Telefon", placeholder: "+90 (555) 000 00 00" },
              { field: "whatsapp" as keyof KlinikProfil, label: "WhatsApp", placeholder: "+90 (555) 000 00 00" },
              { field: "email" as keyof KlinikProfil, label: "E-posta", placeholder: "info@klinik.com" },
              { field: "website" as keyof KlinikProfil, label: "Web Sitesi", placeholder: "www.klinik.com" },
              { field: "vergi_no" as keyof KlinikProfil, label: "Vergi No", placeholder: "1234567890" },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profil[field] as string}
                  onChange={(e) => setProfil((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Instagram</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-slate-400">@</span>
                <input
                  className="w-full border border-slate-200 rounded-xl pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profil.instagram}
                  onChange={(e) => setProfil((p) => ({ ...p, instagram: e.target.value }))}
                  placeholder="klinik_hesabi"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
            <button
              onClick={saveProfil}
              disabled={saving || tablesMissing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Save size={15} />{saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={16} /> Kaydedildi
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                <AlertCircle size={16} /> Hata oluştu
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ÇALIŞMA DÜZENİ ── */}
      {activeTab === "calisma" && (
        <div className="max-w-3xl space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Çalışma Günleri</h2>
            <div className="flex gap-2 flex-wrap">
              {GUNLER.map(({ key, short }) => {
                const active = profil.calisma_gunleri.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleGun(key)}
                    className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                      active ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Çalışma Saatleri</h2>
            <div className="flex items-center gap-4">
              {[
                { field: "calisma_baslangic" as keyof KlinikProfil, label: "Açılış" },
                { field: "calisma_bitis" as keyof KlinikProfil, label: "Kapanış" },
              ].map(({ field, label }, i) => (
                <div key={field} className="flex items-center gap-4">
                  {i === 1 && <span className="text-slate-400 mt-5">→</span>}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                    <select
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={profil[field] as string}
                      onChange={(e) => setProfil((p) => ({ ...p, [field]: e.target.value }))}
                    >
                      {times.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <div className="mt-5 text-sm text-slate-500">
                = <span className="font-semibold text-slate-700">{dailyHours.toFixed(1)} saat</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Varsayılan Randevu Süresi</h2>
            <p className="text-xs text-slate-400 mb-4">Yeni randevu oluştururken önerilen süre</p>
            <div className="flex gap-2 flex-wrap">
              {RANDEVU_SURELER.map((dk) => (
                <button
                  key={dk}
                  onClick={() => setProfil((p) => ({ ...p, randevu_suresi_dk: dk }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    profil.randevu_suresi_dk === dk
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {dk} dk
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">Günlük Kapasite Özeti</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-600 mb-0.5">Çalışma Günleri</p>
                <p className="text-lg font-bold text-blue-800">{profil.calisma_gunleri.length} gün</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-0.5">Günlük Çalışma</p>
                <p className="text-lg font-bold text-blue-800">{dailyHours.toFixed(1)} saat</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-0.5">Günlük Randevu</p>
                <p className="text-lg font-bold text-blue-800">{dailySlots} randevu</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProfil}
              disabled={saving || tablesMissing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Save size={15} />{saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={16} /> Kaydedildi
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: PERSONEL & YETKİLER ── */}
      {activeTab === "personel" && (
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Personel Listesi</h2>
              <p className="text-xs text-slate-400">{personeller.length} personel kayıtlı</p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} /> Personel Ekle
            </button>
          </div>

          {personelLoading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Yükleniyor...</div>
          ) : personeller.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <Users size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">Henüz personel eklenmedi</p>
              <p className="text-xs text-slate-400">Personel ekleyerek maaş ve yetki yönetimi yapabilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {personeller.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                        {initials(p.ad_soyad)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.ad_soyad}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_RENK[p.rol] || "bg-slate-100 text-slate-600"}`}>
                          {p.rol}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.aktif ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    {p.maas > 0 && (
                      <div className="flex justify-between">
                        <span>Maaş</span>
                        <span className="font-medium text-slate-700">₺{p.maas.toLocaleString("tr-TR")}</span>
                      </div>
                    )}
                    {p.prim_yuzdesi > 0 && (
                      <div className="flex justify-between">
                        <span>Prim</span>
                        <span className="font-medium text-slate-700">%{p.prim_yuzdesi}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={() => openEditModal(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 size={13} /> Düzenle
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-rose-600 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={13} /> Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PERSONEL MODAL ── */}
      {modalOpen && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">
                {editingPersonel ? "Personeli Düzenle" : "Yeni Personel Ekle"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-1 p-4 border-b border-slate-100">
              {([
                { key: "bilgiler" as PersonelModalTab, label: "Bilgiler", icon: User },
                { key: "mali" as PersonelModalTab, label: "Mali", icon: DollarSign },
                { key: "yetkiler" as PersonelModalTab, label: "Yetkiler", icon: Shield },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setModalTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    modalTab === key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* BİLGİLER */}
              {modalTab === "bilgiler" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Ad Soyad *</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={personelForm.ad_soyad}
                        onChange={(e) => setPersonelForm((f) => ({ ...f, ad_soyad: e.target.value }))}
                        placeholder="Örn: Ayşe Kaya"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Rol</label>
                      <select
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={personelForm.rol}
                        onChange={(e) => handleRolChange(e.target.value as Rol)}
                      >
                        {(Object.keys(DEFAULT_PERMISSIONS) as Rol[]).map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Durum</label>
                      <button
                        onClick={() => setPersonelForm((f) => ({ ...f, aktif: !f.aktif }))}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          personelForm.aktif
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${personelForm.aktif ? "bg-emerald-500" : "bg-slate-300"}`} />
                        {personelForm.aktif ? "Aktif" : "Pasif"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">E-posta</label>
                      <input
                        type="email"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={personelForm.email}
                        onChange={(e) => setPersonelForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="personel@klinik.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Telefon</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={personelForm.telefon}
                        onChange={(e) => setPersonelForm((f) => ({ ...f, telefon: e.target.value }))}
                        placeholder="+90 555 000 0000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Çalışma Günleri</label>
                    <div className="flex gap-2 flex-wrap">
                      {GUNLER.map(({ key, short }) => {
                        const active = personelForm.is_gunleri.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleIsGun(key)}
                            className={`w-11 h-11 rounded-xl text-xs font-semibold transition-all ${
                              active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { field: "is_baslangic" as keyof typeof personelForm, label: "Başlangıç" },
                      { field: "is_bitis" as keyof typeof personelForm, label: "Bitiş" },
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                        <select
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          value={personelForm[field] as string}
                          onChange={(e) => setPersonelForm((f) => ({ ...f, [field]: e.target.value }))}
                        >
                          {times.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Notlar</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      value={personelForm.notlar}
                      onChange={(e) => setPersonelForm((f) => ({ ...f, notlar: e.target.value }))}
                      placeholder="Personel hakkında notlar..."
                    />
                  </div>
                </div>
              )}

              {/* MALİ */}
              {modalTab === "mali" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Brüt Maaş (₺)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={personelForm.maas}
                        onChange={(e) => setPersonelForm((f) => ({ ...f, maas: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Prim Oranı (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-full border border-slate-200 rounded-xl px-3.5 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={personelForm.prim_yuzdesi}
                          onChange={(e) => setPersonelForm((f) => ({ ...f, prim_yuzdesi: Math.min(100, Number(e.target.value)) }))}
                        />
                        <span className="absolute right-3 top-2.5 text-sm text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPersonelForm((f) => ({ ...f, sgk_dahil: !f.sgk_dahil }))}
                    className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl border transition-all text-sm ${
                      personelForm.sgk_dahil
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className={`w-10 h-5 rounded-full transition-all relative ${personelForm.sgk_dahil ? "bg-blue-600" : "bg-slate-300"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${personelForm.sgk_dahil ? "left-5" : "left-0.5"}`} />
                    </div>
                    SGK dahil (Kesinti: %15)
                  </button>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Mali Özet</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Brüt Maaş</span>
                      <span className="font-medium">₺{personelForm.maas.toLocaleString("tr-TR")}</span>
                    </div>
                    {personelForm.sgk_dahil && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">SGK Kesintisi (%15)</span>
                        <span className="font-medium text-rose-600">−₺{sgkKesinti.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="text-slate-500">Net Maaş</span>
                      <span className="font-semibold text-emerald-600">₺{netMaas.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</span>
                    </div>
                    {personelForm.prim_yuzdesi > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Prim (tahmini)</span>
                          <span className="font-medium text-blue-600">+₺{primTahmini.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                          <span className="font-medium text-slate-600">Toplam Maliyet</span>
                          <span className="font-bold">₺{toplamMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* YETKİLER */}
              {modalTab === "yetkiler" && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={15} className="text-blue-600" />
                    <p className="text-xs text-slate-500">
                      Rol seçildiğinde yetkiler otomatik ayarlanır. İstediğiniz gibi özelleştirebilirsiniz.
                    </p>
                  </div>
                  <div className="flex gap-3 mb-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Tam Erişim</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Görüntüle</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Erişim Yok</span>
                  </div>
                  <div className="space-y-2">
                    {MODULS.map(({ key, label, desc }) => {
                      const current = personelForm.yetkiler[key] || "yok";
                      return (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{label}</p>
                            <p className="text-xs text-slate-400">{desc}</p>
                          </div>
                          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white shrink-0 ml-4">
                            {([
                              { val: "tam" as Yetki, label: "Tam", cls: "bg-blue-600 text-white" },
                              { val: "goruntule" as Yetki, label: "Görüntüle", cls: "bg-amber-500 text-white" },
                              { val: "yok" as Yetki, label: "Yok", cls: "bg-slate-400 text-white" },
                            ]).map(({ val, label: lbl, cls }) => (
                              <button
                                key={val}
                                onClick={() => handleYetki(key, val)}
                                className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                                  current === val ? cls : "text-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {lbl}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">
                İptal
              </button>
              <button
                onClick={savePersonel}
                disabled={personelSaving || !personelForm.ad_soyad.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <Save size={14} />{personelSaving ? "Kaydediliyor..." : editingPersonel ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Personeli Sil</p>
                <p className="text-xs text-slate-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                İptal
              </button>
              <button onClick={() => deletePersonel(deleteConfirm)} className="flex-1 py-2.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
