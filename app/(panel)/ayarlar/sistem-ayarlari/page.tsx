"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Settings, User, Bell, Link2, Info, Save, CheckCircle,
  AlertCircle, Eye, EyeOff, Lock, Copy, Check,
  MessageCircle, CreditCard, Smartphone,
} from "lucide-react";

type MainTab = "hesap" | "bildirimler" | "entegrasyonlar" | "hakkinda";

interface BildirimAyarlari {
  randevu_hatirlatici: boolean;
  hatirlatici_sure: string;
  kritik_stok_uyarisi: boolean;
  yeni_hasta_bildirimi: boolean;
  odeme_bildirimi: boolean;
  gunluk_ozet: boolean;
}

interface EntegrasyonAyarlari {
  wa_api_key: string;
  wa_phone_id: string;
  wa_webhook: string;
  iyzico_api_key: string;
  iyzico_secret: string;
  paytr_token: string;
}

const DEFAULT_BILDIRIMLER: BildirimAyarlari = {
  randevu_hatirlatici: true,
  hatirlatici_sure: "24",
  kritik_stok_uyarisi: true,
  yeni_hasta_bildirimi: false,
  odeme_bildirimi: true,
  gunluk_ozet: false,
};

const DEFAULT_ENTEGRASYON: EntegrasyonAyarlari = {
  wa_api_key: "", wa_phone_id: "", wa_webhook: "",
  iyzico_api_key: "", iyzico_secret: "", paytr_token: "",
};

const CHANGELOG = [
  { version: "1.0.0", date: "Mayıs 2026", items: ["İlk sürüm yayınlandı", "Hasta, randevu ve finans modülleri aktif", "Stok takibi ve istatistikler eklendi"] },
];

export default function SistemAyarlariPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("hesap");

  // Hesap
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error" | "mismatch">("idle");
  const [pwError, setPwError] = useState("");

  // Bildirimler
  const [bildirimler, setBildirimler] = useState<BildirimAyarlari>(DEFAULT_BILDIRIMLER);
  const [bildirimSaved, setBildirimSaved] = useState(false);

  // Entegrasyonlar
  const [entegrasyon, setEntegrasyon] = useState<EntegrasyonAyarlari>(DEFAULT_ENTEGRASYON);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [entSaved, setEntSaved] = useState(false);

  // Webhook copy
  const [webhookCopied, setWebhookCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });

    // Load localStorage settings
    try {
      const stored = localStorage.getItem("aesthecore_bildirimler");
      if (stored) setBildirimler({ ...DEFAULT_BILDIRIMLER, ...(JSON.parse(stored) as Partial<BildirimAyarlari>) });
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem("aesthecore_entegrasyon");
      if (stored) setEntegrasyon({ ...DEFAULT_ENTEGRASYON, ...(JSON.parse(stored) as Partial<EntegrasyonAyarlari>) });
    } catch { /* ignore */ }
  }, [supabase]);

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwStatus("mismatch");
      return;
    }
    if (newPassword.length < 6) {
      setPwStatus("error");
      setPwError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwStatus("error");
      setPwError(error.message);
    } else {
      setPwStatus("success");
      setNewPassword("");
      setConfirmPassword("");
    }
    setTimeout(() => setPwStatus("idle"), 4000);
  };

  const saveBildirimler = () => {
    localStorage.setItem("aesthecore_bildirimler", JSON.stringify(bildirimler));
    setBildirimSaved(true);
    setTimeout(() => setBildirimSaved(false), 2500);
  };

  const saveEntegrasyon = () => {
    localStorage.setItem("aesthecore_entegrasyon", JSON.stringify(entegrasyon));
    setEntSaved(true);
    setTimeout(() => setEntSaved(false), 2500);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((s) => ({ ...s, [key]: !s[key] }));
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText("https://aesthecore.app/api/whatsapp/webhook");
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${value ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
    </button>
  );

  const SecretInput = ({
    label, field, placeholder,
  }: { label: string; field: keyof EntegrasyonAyarlari; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[field] ? "text" : "password"}
          className="w-full border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          value={entegrasyon[field]}
          onChange={(e) => setEntegrasyon((s) => ({ ...s, [field]: e.target.value }))}
          placeholder={placeholder || "••••••••••••"}
        />
        <button
          onClick={() => toggleSecret(field)}
          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
          type="button"
        >
          {showSecrets[field] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sistem Ayarları</h1>
          <p className="text-sm text-slate-500">Hesap, bildirimler ve entegrasyon yönetimi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 mb-6 w-fit gap-1 flex-wrap">
        {([
          { key: "hesap" as MainTab, label: "Hesap", icon: User },
          { key: "bildirimler" as MainTab, label: "Bildirimler", icon: Bell },
          { key: "entegrasyonlar" as MainTab, label: "Entegrasyonlar", icon: Link2 },
          { key: "hakkinda" as MainTab, label: "Hakkında", icon: Info },
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

      {/* ── TAB: HESAP ── */}
      {activeTab === "hesap" && (
        <div className="max-w-2xl space-y-5">
          {/* Kullanıcı Kartı */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Kullanıcı Bilgileri</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 border-2 border-blue-200">
                OD
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800">Dr. Oğuzhan Durmuş</p>
                <p className="text-sm text-slate-500">{userEmail || "Yükleniyor..."}</p>
                <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                  Yönetici
                </span>
              </div>
            </div>
          </div>

          {/* Şifre Değiştir */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={16} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">Şifre Değiştir</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                  />
                  <button onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-2.5 text-slate-400">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Şifreyi Onayla</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                />
              </div>
            </div>

            {pwStatus === "mismatch" && (
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> Şifreler eşleşmiyor.
              </p>
            )}
            {pwStatus === "error" && (
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> {pwError}
              </p>
            )}
            {pwStatus === "success" && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle size={12} /> Şifre başarıyla güncellendi.
              </p>
            )}

            <button
              onClick={changePassword}
              disabled={pwSaving || !newPassword || !confirmPassword}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Save size={14} />{pwSaving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: BİLDİRİMLER ── */}
      {activeTab === "bildirimler" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {/* Randevu hatırlatıcı */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Randevu Hatırlatıcı</p>
                  <p className="text-xs text-slate-400 mt-0.5">Yaklaşan randevular için otomatik hatırlatma</p>
                </div>
                <Toggle
                  value={bildirimler.randevu_hatirlatici}
                  onChange={(v) => setBildirimler((b) => ({ ...b, randevu_hatirlatici: v }))}
                />
              </div>
              {bildirimler.randevu_hatirlatici && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Hatırlatma zamanı</label>
                  <select
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={bildirimler.hatirlatici_sure}
                    onChange={(e) => setBildirimler((b) => ({ ...b, hatirlatici_sure: e.target.value }))}
                  >
                    <option value="1">1 saat önce</option>
                    <option value="2">2 saat önce</option>
                    <option value="24">1 gün önce</option>
                    <option value="48">2 gün önce</option>
                  </select>
                </div>
              )}
            </div>

            {[
              { key: "kritik_stok_uyarisi" as keyof BildirimAyarlari, label: "Kritik Stok Uyarısı", desc: "Stok kritik seviyenin altına düştüğünde bildirim" },
              { key: "yeni_hasta_bildirimi" as keyof BildirimAyarlari, label: "Yeni Hasta Bildirimi", desc: "Sisteme yeni hasta eklendiğinde bildirim" },
              { key: "odeme_bildirimi" as keyof BildirimAyarlari, label: "Ödeme Bildirimi", desc: "Yeni gelir kaydı oluşturulduğunda bildirim" },
              { key: "gunluk_ozet" as keyof BildirimAyarlari, label: "Günlük Özet", desc: "Her sabah günlük randevu ve gelir özeti" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <Toggle
                  value={bildirimler[key] as boolean}
                  onChange={(v) => setBildirimler((b) => ({ ...b, [key]: v }))}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={saveBildirimler}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Save size={14} /> Kaydet
            </button>
            {bildirimSaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} /> Kaydedildi
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ENTEGRASYONLAR ── */}
      {activeTab === "entegrasyonlar" && (
        <div className="max-w-2xl space-y-5">
          {/* WhatsApp */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <MessageCircle size={16} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">WhatsApp Business API</h2>
                <p className="text-xs text-slate-400">Hasta iletişimi için</p>
              </div>
            </div>
            <div className="space-y-4">
              <SecretInput label="API Key" field="wa_api_key" />
              <SecretInput label="Phone Number ID" field="wa_phone_id" />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Webhook URL (kopyalayın)</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 font-mono"
                    value="https://aesthecore.app/api/whatsapp/webhook"
                  />
                  <button
                    onClick={copyWebhook}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    {webhookCopied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* iyzico */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <CreditCard size={16} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">iyzico Ödeme</h2>
                <p className="text-xs text-slate-400">Online ödeme entegrasyonu</p>
              </div>
            </div>
            <div className="space-y-4">
              <SecretInput label="API Key" field="iyzico_api_key" />
              <SecretInput label="Secret Key" field="iyzico_secret" />
            </div>
          </div>

          {/* PayTR */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Smartphone size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">PayTR</h2>
                <p className="text-xs text-slate-400">Alternatif ödeme altyapısı</p>
              </div>
            </div>
            <SecretInput label="Merchant Token" field="paytr_token" />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-2.5">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              API anahtarları bu cihazda yerel olarak saklanmaktadır. Ortak bilgisayarlarda kullanmayınız.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveEntegrasyon}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Save size={14} /> Kaydet
            </button>
            {entSaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} /> Kaydedildi
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: HAKKINDA ── */}
      {activeTab === "hakkinda" && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-5">
              <img src="/aesthecore-logo.PNG" alt="AestheCore" className="w-14 h-14 object-contain" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">AestheCore</h2>
                <p className="text-sm text-slate-500">Estetik Klinik Yönetim Sistemi</p>
                <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                  v1.0.0
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Sürüm</span>
                <span className="font-medium text-slate-700">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Platform</span>
                <span className="font-medium text-slate-700">Next.js + Supabase</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Veritabanı</span>
                <span className="font-mono text-xs text-slate-600">ukvapprhnakpdqjyifzm</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Destek</span>
                <a href="mailto:droguzhandurmus@gmail.com" className="text-blue-600 hover:underline text-xs font-medium">
                  droguzhandurmus@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Güncelleme Geçmişi</h3>
            {CHANGELOG.map(({ version, date, items }) => (
              <div key={version} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">v{version}</span>
                  <span className="text-xs text-slate-400">{date}</span>
                </div>
                <ul className="space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
