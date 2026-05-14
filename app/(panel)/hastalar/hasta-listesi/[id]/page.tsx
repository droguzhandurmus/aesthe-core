"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Phone, IdCard, Stethoscope, ImageIcon, NotebookPen,
  CalendarCheck2, Loader2, AlertCircle, MessageCircle, CalendarPlus,
  Star, User, MapPin, Cake, Tag, Plus, Clock, FileText,
  Save, X, Pencil, Trash2, Calendar, CheckCircle2, XCircle,
  Archive, ChevronDown, Briefcase, Wallet, Target, ArrowUpDown, Share2,
} from "lucide-react";
import { PhoneInput } from "@/app/components/PhoneInput";
import { ReferansSecici, formatReferansGorunum } from "@/app/components/ReferansSecici";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import YeniRandevuModal from "../../../randevular/components/YeniRandevuModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  dosya_no: number | null;
  ad_soyad: string;
  telefon: string | null;
  tc_kimlik: string | null;
  islem: string | null;
  durum: string | null;
  cinsiyet: string | null;
  dogum_tarihi: string | null;
  ulke: string | null;
  etiketler: string[] | null;
  son_randevu_tarihi: string | null;
  created_at: string;
  doktor_puani: number | null;
  hasta_puani: number | null;
  notlar: string | null;
  meslek: string | null;
  referans: string | null;
};

type Randevu = {
  id: string;
  tarih: string;
  islem_turu: string | null;
  sure_dk: number | null;
  durum: string | null;
  notlar: string | null;
};

type AmeliyatNotu = {
  id: string;
  tarih: string;
  islem_adi: string | null;
  notlar: string | null;
  hekim: string | null;
};

type IslemNotu = {
  id: string;
  baslik: string | null;
  not: string | null;
  tur: "Ameliyat" | "Klinik İşlem" | null;
  islem_tarihi: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700 border-purple-200",
  Düzenli: "bg-blue-100 text-blue-700 border-blue-200",
  Eski: "bg-gray-100 text-gray-700 border-gray-200",
  Komplikasyon: "bg-red-100 text-red-700 border-red-200",
  Yabancı: "bg-orange-100 text-orange-700 border-orange-200",
  İndirimli: "bg-green-100 text-green-700 border-green-200",
};

const DURUM_STYLES: Record<string, string> = {
  "Ödeme Bekliyor": "bg-amber-50 text-amber-700 border-amber-200",
  "Tamamlandı": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "İptal": "bg-red-50 text-red-600 border-red-200",
};

const RANDEVU_DURUM: Record<string, string> = {
  Bekliyor: "bg-amber-100 text-amber-700",
  Onaylandı: "bg-emerald-100 text-emerald-700",
  Tamamlandı: "bg-blue-100 text-blue-700",
  İptal: "bg-red-100 text-red-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yasHesapla(dogumTarihi: string | null): number | null {
  if (!dogumTarihi) return null;
  const d = new Date(dogumTarihi);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y--;
  return y;
}

function tarihFormatla(tarih: string | null, withTime = false) {
  if (!tarih) return "-";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  if (withTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return new Date(tarih).toLocaleDateString("tr-TR", opts);
}

function initials(adSoyad: string) {
  return adSoyad.trim().split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("");
}

function parseIslemNotu(raw: string | null): { not: string; anestezi?: string; sure_dk?: string; asa?: string; komplikasyon?: string } {
  if (!raw) return { not: "" };
  const FIELDS_M = "__fields__:";
  if (raw.startsWith(FIELDS_M)) {
    const nlIdx = raw.indexOf("\n\n");
    const jsonPart = nlIdx !== -1 ? raw.slice(FIELDS_M.length, nlIdx) : raw.slice(FIELDS_M.length);
    const notPart = nlIdx !== -1 ? raw.slice(nlIdx + 2) : "";
    try { const sf = JSON.parse(jsonPart); return { not: notPart, ...sf }; } catch { return { not: notPart }; }
  }
  const sections = ["✦PREOPERATİF:", "✦İNTRAOPERATİF:", "✦POSTOPERATİF:"];
  const labels = ["Preoperatif", "İntraoperatif", "Postoperatif"];
  if (sections.some(s => raw.includes(s))) {
    let result = "";
    sections.forEach((marker, i) => {
      const idx = raw.indexOf(marker);
      if (idx === -1) return;
      const nextIdx = sections.slice(i + 1).reduce((min, m) => { const pos = raw.indexOf(m, idx + marker.length); return pos !== -1 && pos < min ? pos : min; }, raw.length);
      const content = raw.slice(idx + marker.length, nextIdx).trim();
      if (content) result += (result ? "\n\n" : "") + `${labels[i]}:\n${content}`;
    });
    return { not: result };
  }
  return { not: raw };
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly = false, size = 16 }: { value: number | null; onChange?: (v: number) => void; readonly?: boolean; size?: number }) {
  const [hov, setHov] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" disabled={readonly}
          onMouseEnter={() => !readonly && setHov(s)} onMouseLeave={() => !readonly && setHov(0)}
          onClick={() => !readonly && onChange?.(s)}
          className={clsx("transition", readonly ? "cursor-default" : "cursor-pointer hover:scale-110")}>
          <Star size={size} className={clsx((hov || value || 0) >= s ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200")} />
        </button>
      ))}
    </div>
  );
}

// ─── Randevular Tab ───────────────────────────────────────────────────────────

function RandevularTab({ hastaId, hastaAdi, hastaTelefon }: { hastaId: string; hastaAdi: string; hastaTelefon: string | null }) {
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRandevular = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("randevular")
      .select("id, tarih, islem_turu, sure_dk, durum, notlar")
      .eq("hasta_id", hastaId)
      .order("tarih", { ascending: false });
    setRandevular((data as Randevu[]) ?? []);
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchRandevular(); }, [fetchRandevular]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{randevular.length} randevu kaydı</p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus size={15} /> Yeni Randevu
        </button>
      </div>

      {randevular.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarCheck2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-500 mb-1">Henüz randevu yok</p>
          <p className="text-sm">Bu hasta için kayıtlı randevu bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {randevular.map((r) => {
            const rawIslem = r.islem_turu ?? "Belirtilmedi";
            const colonIdx = rawIslem.indexOf(": ");
            const kategori = colonIdx !== -1 ? rawIslem.slice(0, colonIdx) : rawIslem;
            const islem = colonIdx !== -1 ? rawIslem.slice(colonIdx + 2) : "";
            const durum = r.durum ?? "Bekliyor";
            return (
              <div key={r.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition group">
                <div className="flex flex-col items-center justify-center w-14 shrink-0 text-center">
                  <span className="text-lg font-bold text-slate-800 leading-none">
                    {new Date(r.tarih).getDate()}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {new Date(r.tarih).toLocaleDateString("tr-TR", { month: "short" })}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(r.tarih).getFullYear()}
                  </span>
                </div>
                <div className="w-px h-10 bg-slate-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{islem || kategori}</span>
                    {islem && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{kategori}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(r.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      {r.sure_dk ? ` · ${r.sure_dk} dk` : ""}
                    </span>
                  </div>
                  {r.notlar && <p className="text-xs text-slate-500 mt-1 truncate">{r.notlar}</p>}
                </div>
                <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold shrink-0", RANDEVU_DURUM[durum] ?? "bg-slate-100 text-slate-600")}>
                  {durum}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <YeniRandevuModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultHastaId={hastaId}
        defaultHastaAdi={hastaAdi}
        defaultHastaTelefon={hastaTelefon ?? undefined}
        onSaved={() => { setModalOpen(false); fetchRandevular(); }}
      />
    </div>
  );
}

// ─── Klinik Notları Tab ───────────────────────────────────────────────────────

function KlinikNotlariTab({ hastaId }: { hastaId: string }) {
  const [notlar, setNotlar] = useState<AmeliyatNotu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tarih: "", islem_adi: "", notlar: "", hekim: "" });

  const fetchNotlar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ameliyat_notlari")
      .select("id, tarih, islem_adi, notlar, hekim")
      .eq("hasta_id", hastaId)
      .order("tarih", { ascending: false });
    setNotlar(((data as AmeliyatNotu[]) ?? []).filter(n => n.islem_adi !== "Ödeme Notu"));
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchNotlar(); }, [fetchNotlar]);

  async function handleSave() {
    if (!form.islem_adi.trim() && !form.notlar.trim()) return;
    setSaving(true);
    const tarih = form.tarih || new Date().toISOString();
    await supabase.from("ameliyat_notlari").insert([{
      hasta_id: hastaId,
      tarih,
      islem_adi: form.islem_adi || null,
      notlar: form.notlar || null,
      hekim: form.hekim || null,
    }]);
    setForm({ tarih: "", islem_adi: "", notlar: "", hekim: "" });
    setShowForm(false);
    setSaving(false);
    fetchNotlar();
  }

  async function handleDelete(id: string) {
    await supabase.from("ameliyat_notlari").delete().eq("id", id);
    setNotlar((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{notlar.length} klinik notu</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus size={15} /> Not Ekle
        </button>
      </div>

      {/* Not Ekleme Formu */}
      {showForm && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-800">Yeni Klinik Notu</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Tarih</label>
              <input type="datetime-local" value={form.tarih} onChange={(e) => setForm((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Hekim</label>
              <input value={form.hekim} onChange={(e) => setForm((p) => ({ ...p, hekim: e.target.value }))}
                placeholder="Dr. ..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">İşlem Adı</label>
            <input value={form.islem_adi} onChange={(e) => setForm((p) => ({ ...p, islem_adi: e.target.value }))}
              placeholder="Rinoplasti, Botoks..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Notlar</label>
            <textarea value={form.notlar} onChange={(e) => setForm((p) => ({ ...p, notlar: e.target.value }))}
              rows={3} placeholder="Ameliyat notları, gözlemler..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-white transition">İptal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
            </button>
          </div>
        </div>
      )}

      {notlar.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <NotebookPen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-500 mb-1">Henüz klinik notu yok</p>
          <p className="text-sm">Not Ekle butonuna tıklayarak ilk notu oluşturun.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notlar.map((n) => (
            <div key={n.id} className="relative p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {n.islem_adi && (
                      <span className="font-semibold text-slate-800 text-sm">{n.islem_adi}</span>
                    )}
                    {n.hekim && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{n.hekim}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{tarihFormatla(n.tarih, true)}</p>
                  {n.notlar && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{n.notlar}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── İşlem Notları Tab ───────────────────────────────────────────────────────

function IslemNotlariTab({ hastaId }: { hastaId: string }) {
  const [notlar, setNotlar] = useState<IslemNotu[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotlar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("islem_notlari")
      .select("id, baslik, not, tur, islem_tarihi")
      .eq("hasta_id", hastaId)
      .order("islem_tarihi", { ascending: false });
    setNotlar((data as IslemNotu[]) ?? []);
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchNotlar(); }, [fetchNotlar]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{notlar.length} işlem notu</p>
        <a
          href="/tibbi-kayitlar/ameliyat-islem-notlari"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus size={15} /> Yeni Not Ekle
        </a>
      </div>

      {notlar.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-500 mb-1">Henüz işlem notu yok</p>
          <p className="text-sm">Ameliyat veya klinik işlem notları burada görünür.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notlar.map((n) => {
            const parsed = parseIslemNotu(n.not);
            const islemler = n.baslik?.split(",").map(b => b.trim()).filter(Boolean) ?? [];
            return (
              <div key={n.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition">
                <div className="flex items-start gap-3">
                  <span className={clsx(
                    "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5",
                    n.tur === "Ameliyat"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-sky-50 text-sky-600 border-sky-200"
                  )}>
                    {n.tur ?? "İşlem"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {islemler.length > 0
                        ? islemler.map(i => <span key={i} className="text-sm font-semibold text-slate-800">{i}</span>)
                        : <span className="text-sm font-semibold text-slate-400 italic">İsimsiz not</span>
                      }
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{tarihFormatla(n.islem_tarihi, false)}</p>
                    {(parsed.anestezi || parsed.sure_dk || parsed.asa || parsed.komplikasyon) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 bg-slate-50 rounded-lg px-3 py-2">
                        {parsed.anestezi && <span className="text-xs text-slate-500">Anestezi: <span className="font-medium text-slate-700">{parsed.anestezi}</span></span>}
                        {parsed.sure_dk && <span className="text-xs text-slate-500">Süre: <span className="font-medium text-slate-700">{parsed.sure_dk} dk</span></span>}
                        {parsed.asa && <span className="text-xs text-slate-500">ASA: <span className="font-medium text-slate-700">{parsed.asa}</span></span>}
                        {parsed.komplikasyon && <span className="text-xs text-slate-500">Komplikasyon: <span className="font-medium text-slate-700">{parsed.komplikasyon}</span></span>}
                      </div>
                    )}
                    {parsed.not && (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-5">{parsed.not}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Fotoğraflar Tab ──────────────────────────────────────────────────────────

function FotograflarTab({ hastaId }: { hastaId: string }) {
  const [fotograflar, setFotograflar] = useState<{ id: string; tip: string; url: string; aciklama: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("fotograflar").select("id, tip, url, aciklama").eq("hasta_id", hastaId)
      .then(({ data }) => { setFotograflar(data ?? []); setLoading(false); });
  }, [hastaId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  if (fotograflar.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
          <ImageIcon size={32} className="text-blue-300" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-1">Fotoğraf galerisi boş</h3>
        <p className="text-sm text-slate-500 max-w-xs mb-6">
          Hastanın öncesi/sonrası fotoğraflarını yükleyerek tedavi sürecini belgeleyin.
        </p>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition shadow-sm">
          <ImageIcon size={16} /> Fotoğraf Yükle
        </button>
        <p className="text-[11px] text-slate-400 mt-3">JPEG, PNG · Maks. 10 MB</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{fotograflar.length} fotoğraf</p>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus size={15} /> Fotoğraf Ekle
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fotograflar.map((f) => (
          <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
            <img src={f.url} alt={f.aciklama ?? ""} className="w-full h-full object-cover" />
            {f.tip && (
              <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">{f.tip}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ödeme Takibi Paneli ──────────────────────────────────────────────────────

function OdemeTakibiPanel({ hastaId, durum, onDurumChange }: {
  hastaId: string; durum: string | null; onDurumChange: (d: string) => void;
}) {
  const [notlar, setNotlar] = useState<{ id: string; tarih: string; notlar: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [yeniNot, setYeniNot] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotlar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ameliyat_notlari")
      .select("id, tarih, notlar")
      .eq("hasta_id", hastaId).eq("islem_adi", "Ödeme Notu")
      .order("tarih", { ascending: false });
    setNotlar(data ?? []);
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchNotlar(); }, [fetchNotlar]);

  async function handleAdd() {
    if (!yeniNot.trim()) return;
    setSaving(true);
    await supabase.from("ameliyat_notlari").insert({
      hasta_id: hastaId, islem_adi: "Ödeme Notu",
      tarih: new Date().toISOString(),
      notlar: yeniNot.trim(), hekim: null,
    });
    setYeniNot(""); setSaving(false); fetchNotlar();
  }

  async function handleDelete(id: string) {
    await supabase.from("ameliyat_notlari").delete().eq("id", id);
    setNotlar(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
        <Wallet size={14} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Ödeme Takibi</h3>
      </div>

      {/* Ödeme Durumu */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Durum</p>
        <div className="space-y-1.5">
          {["Ödeme Bekliyor", "Tamamlandı", "İptal"].map((d) => (
            <button key={d} onClick={() => onDurumChange(d)}
              className={clsx(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition text-left",
                durum === d
                  ? (DURUM_STYLES[d] ?? "bg-blue-50 text-blue-700 border-blue-200") + " ring-1 ring-offset-1 ring-blue-300"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
              )}>
              {durum === d
                ? <CheckCircle2 size={12} className="shrink-0" />
                : <div className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0" />
              }
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Not Ekle */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Ödeme Notu Ekle</p>
        <textarea value={yeniNot} onChange={e => setYeniNot(e.target.value)} rows={2}
          placeholder="Ör: Kapora alındı, bakiye Mayıs'ta..."
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAdd(); }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        <button onClick={handleAdd} disabled={saving || !yeniNot.trim()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Notu Kaydet
        </button>
      </div>

      {/* Notlar Listesi */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-slate-300" />
          </div>
        ) : notlar.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Wallet size={22} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs">Henüz ödeme notu yok</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notlar.map(n => (
              <div key={n.id} className="flex items-start gap-2 px-4 py-3 group hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">{n.notlar}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(n.tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => handleDelete(n.id)}
                  className="shrink-0 p-1 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sonraki Randevu Widget ───────────────────────────────────────────────────

function SonrakiRandevuWidget({ hastaId, hastaAdi, hastaTelefon }: { hastaId: string; hastaAdi: string; hastaTelefon: string | null }) {
  const router = useRouter();
  const [sonraki, setSonraki] = useState<Randevu | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSonraki = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("randevular")
      .select("id, tarih, islem_turu, sure_dk, durum, notlar")
      .eq("hasta_id", hastaId)
      .gte("tarih", new Date().toISOString())
      .in("durum", ["Bekliyor", "Onaylandı"])
      .order("tarih", { ascending: true })
      .limit(1);
    setSonraki(data?.[0] ?? null);
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchSonraki(); }, [fetchSonraki]);

  const raw = sonraki?.islem_turu ?? "";
  const ci = raw.indexOf(": ");
  const islemAdi = ci !== -1 ? raw.slice(ci + 2) : raw;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CalendarCheck2 size={13} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sonraki Randevu</h3>
        </div>
        <button onClick={() => setModalOpen(true)} title="Yeni Randevu"
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition">
          <Plus size={14} />
        </button>
      </div>

      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-300" />
      ) : sonraki ? (
        <button
          type="button"
          onClick={() => router.push(`/randevular/tum-randevular?randevuId=${sonraki.id}`)}
          className="w-full text-left bg-blue-50 rounded-xl p-3 border border-blue-100 hover:border-blue-300 hover:bg-blue-100/70 transition"
        >
          {islemAdi && <p className="text-sm font-semibold text-slate-800 leading-snug">{islemAdi}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
            <Calendar size={11} className="text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">
              {new Date(sonraki.tarih).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "long" })}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock size={11} className="shrink-0" />
            {new Date(sonraki.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            {sonraki.sure_dk ? ` · ${sonraki.sure_dk} dk` : ""}
          </p>
          {sonraki.durum && (
            <span className={clsx("inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full", RANDEVU_DURUM[sonraki.durum] ?? "bg-slate-100 text-slate-500")}>
              {sonraki.durum}
            </span>
          )}
        </button>
      ) : (
        <div className="text-center py-2">
          <CalendarPlus size={24} className="mx-auto mb-2 text-slate-200" />
          <p className="text-xs text-slate-400 mb-2">Yaklaşan randevu yok</p>
          <button onClick={() => setModalOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mx-auto bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
            <Plus size={12} /> Randevu Ekle
          </button>
        </div>
      )}

      <YeniRandevuModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultHastaId={hastaId}
        defaultHastaAdi={hastaAdi}
        defaultHastaTelefon={hastaTelefon ?? undefined}
        onSaved={() => { setModalOpen(false); fetchSonraki(); }}
      />
    </div>
  );
}

// ─── Tedavi Hedefleri Widget ──────────────────────────────────────────────────

function TedaviHedefleriWidget({ hastaId, className }: { hastaId: string; className?: string }) {
  const [hedefler, setHedefler] = useState<{ id: string; notlar: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [yeni, setYeni] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchHedefler = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ameliyat_notlari")
      .select("id, notlar")
      .eq("hasta_id", hastaId)
      .eq("islem_adi", "Tedavi Hedefi")
      .order("tarih", { ascending: true });
    setHedefler(data ?? []);
    setLoading(false);
  }, [hastaId]);

  useEffect(() => { fetchHedefler(); }, [fetchHedefler]);

  async function handleAdd() {
    const v = yeni.trim();
    if (!v) return;
    setSaving(true);
    await supabase.from("ameliyat_notlari").insert({
      hasta_id: hastaId, islem_adi: "Tedavi Hedefi",
      tarih: new Date().toISOString(),
      notlar: v, hekim: null,
    });
    setYeni(""); setSaving(false); fetchHedefler();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleDelete(id: string) {
    await supabase.from("ameliyat_notlari").delete().eq("id", id);
    setHedefler(prev => prev.filter(h => h.id !== id));
  }

  return (
    <div className={clsx("bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col", className)}>
      {/* Header — SonrakiRandevu ile aynı yapı */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tedavi Hedefleri</h3>
        </div>
      </div>

      {/* Hedef Listesi — flex-1 ile kalan alanı doldurur */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <Loader2 size={14} className="animate-spin text-slate-300" />
        ) : hedefler.length === 0 ? (
          <div className="text-center py-4">
            <Target size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-xs text-slate-400">Henüz hedef eklenmedi</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {hedefler.map(h => (
              <li key={h.id} className="flex items-center gap-2 group">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-px" />
                <span className="flex-1 text-xs text-slate-700 leading-snug">{h.notlar}</span>
                <button onClick={() => handleDelete(h.id)}
                  className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100">
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hedef Ekle — alt kısımda sabit */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
        <input
          ref={inputRef}
          value={yeni}
          onChange={e => setYeni(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Yeni hedef ekle..."
          className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button onClick={handleAdd} disabled={saving || !yeni.trim()}
          className="shrink-0 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        </button>
      </div>
    </div>
  );
}

// ─── Hasta Düzenle Modal ──────────────────────────────────────────────────────

function HastaDuzenleModal({ hasta, onClose, onSaved }: { hasta: Patient; onClose: () => void; onSaved: (updated: Patient) => void }) {
  const [form, setForm] = useState({
    ad_soyad: hasta.ad_soyad,
    telefon: hasta.telefon ?? "",
    tc_kimlik: hasta.tc_kimlik ?? "",
    cinsiyet: hasta.cinsiyet ?? "Seçiniz",
    dogum_tarihi: hasta.dogum_tarihi ?? "",
    ulke: hasta.ulke ?? "Türkiye",
    meslek: hasta.meslek ?? "",
    notlar: hasta.notlar ?? "",
    referans: hasta.referans ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [hata, setHata] = useState("");

  async function handleSave() {
    if (!form.ad_soyad.trim()) { setHata("Ad soyad zorunludur."); return; }
    setSaving(true); setHata("");
    const { data, error } = await supabase.from("hastalar").update({
      ad_soyad: form.ad_soyad.trim(),
      telefon: form.telefon || null,
      tc_kimlik: form.tc_kimlik || null,
      cinsiyet: form.cinsiyet === "Seçiniz" ? null : form.cinsiyet,
      dogum_tarihi: form.dogum_tarihi || null,
      ulke: form.ulke || null,
      meslek: form.meslek || null,
      notlar: form.notlar || null,
      referans: form.referans || null,
    }).eq("id", hasta.id).select("*").single();
    setSaving(false);
    if (error) { setHata(error.message); return; }
    if (data) onSaved(data as Patient);
  }

  const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">Hasta Bilgilerini Düzenle</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad <span className="text-red-500">*</span></label>
            <input value={form.ad_soyad} onChange={e => setForm(p => ({ ...p, ad_soyad: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
            <PhoneInput value={form.telefon} onChange={val => setForm(p => ({ ...p, telefon: val }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TC Kimlik / Pasaport</label>
              <input value={form.tc_kimlik} onChange={e => setForm(p => ({ ...p, tc_kimlik: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cinsiyet</label>
              <select value={form.cinsiyet} onChange={e => setForm(p => ({ ...p, cinsiyet: e.target.value }))}
                className={inp + " bg-white"}>
                <option>Seçiniz</option><option>Kadın</option><option>Erkek</option><option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Doğum Tarihi</label>
              <input type="date" value={form.dogum_tarihi} onChange={e => setForm(p => ({ ...p, dogum_tarihi: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ülke</label>
              <input value={form.ulke} onChange={e => setForm(p => ({ ...p, ulke: e.target.value }))} className={inp} placeholder="Türkiye" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Meslek</label>
            <input value={form.meslek} onChange={e => setForm(p => ({ ...p, meslek: e.target.value }))}
              placeholder="Öğretmen, Mühendis, Ev Hanımı..." className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Kliniği Nasıl Öğrendi?</label>
            <ReferansSecici
              value={form.referans}
              onChange={v => setForm(p => ({ ...p, referans: v }))}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notlar</label>
            <textarea value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} rows={3}
              className={inp + " resize-none"} />
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">İptal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Arşiv Tab ────────────────────────────────────────────────────────────────

type ArşivItem =
  | { tip: "randevu"; id: string; tarih: string; islem_turu: string | null; sure_dk: number | null; durum: string | null; notlar: string | null }
  | { tip: "klinik-not"; id: string; tarih: string; islem_adi: string | null; notlar: string | null; hekim: string | null }
  | { tip: "islem-notu"; id: string; tarih: string; baslik: string | null; not: string | null; tur: string | null };

function ArşivTab({ hastaId }: { hastaId: string }) {
  const [items, setItems] = useState<ArşivItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acik, setAcik] = useState<Set<string>>(new Set());
  const [sira, setSira] = useState<"yeni" | "eski">("yeni");

  useEffect(() => {
    async function fetchAll() {
      const [{ data: randevular }, { data: klinikNotlar }, { data: islemNotlari }] = await Promise.all([
        supabase.from("randevular").select("id, tarih, islem_turu, sure_dk, durum, notlar").eq("hasta_id", hastaId),
        supabase.from("ameliyat_notlari").select("id, tarih, islem_adi, notlar, hekim").eq("hasta_id", hastaId),
        supabase.from("islem_notlari").select("id, islem_tarihi, baslik, not, tur").eq("hasta_id", hastaId),
      ]);
      const combined: ArşivItem[] = [
        ...(randevular ?? []).map(r => ({ tip: "randevu" as const, ...r })),
        ...(klinikNotlar ?? []).filter(n => n.islem_adi !== "Ödeme Notu").map(n => ({ tip: "klinik-not" as const, ...n })),
        ...(islemNotlari ?? []).map(n => ({ tip: "islem-notu" as const, tarih: (n as { islem_tarihi: string | null }).islem_tarihi ?? "", ...n })),
      ].filter(i => i.tarih).sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      setItems(combined);
      setLoading(false);
    }
    fetchAll();
  }, [hastaId]);

  function toggle(key: string) {
    setAcik(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  const goruntulenenItems = sira === "yeni" ? items : [...items].reverse();

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  if (items.length === 0) return (
    <div className="text-center py-16">
      <Archive size={40} className="mx-auto mb-3 text-slate-200" />
      <p className="font-medium text-slate-500">Henüz kayıt yok</p>
      <p className="text-sm text-slate-400 mt-1">Bu hastanın tüm geçmiş kayıtları burada görünecek.</p>
    </div>
  );

  const groups: { label: string; items: ArşivItem[] }[] = [];
  for (const item of goruntulenenItems) {
    const label = new Date(item.tarih).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{items.length} kayıt</p>
        <button
          onClick={() => setSira(s => s === "yeni" ? "eski" : "yeni")}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
        >
          <ArrowUpDown size={12} />
          {sira === "yeni" ? "Yeniden Eskiye" : "Eskiden Yeniye"}
        </button>
      </div>
      {groups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{group.label}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-2">
            {group.items.map(item => {
              const key = `${item.tip}-${item.id}`;
              const isAcik = acik.has(key);

              if (item.tip === "randevu") {
                const raw = item.islem_turu ?? "Belirtilmedi";
                const ci = raw.indexOf(": ");
                const kategori = ci !== -1 ? raw.slice(0, ci) : "";
                const islem = ci !== -1 ? raw.slice(ci + 2) : raw;
                const durum = item.durum ?? "Bekliyor";
                return (
                  <div key={key} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => toggle(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <CalendarCheck2 size={15} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{islem}</span>
                          {kategori && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{kategori}</span>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(item.tarih).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                          {item.sure_dk ? ` · ${item.sure_dk} dk` : ""}
                        </span>
                      </div>
                      <span className={clsx("text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0", RANDEVU_DURUM[durum] ?? "bg-slate-100 text-slate-500")}>{durum}</span>
                      {item.notlar && <ChevronDown size={14} className={clsx("text-slate-400 transition shrink-0", isAcik && "rotate-180")} />}
                    </button>
                    {isAcik && item.notlar && (
                      <div className="px-4 pb-3 border-t border-slate-50">
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mt-2">{item.notlar}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.tip === "klinik-not") {
                return (
                  <div key={key} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => toggle(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <NotebookPen size={15} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{item.islem_adi || "Klinik Notu"}</span>
                          {item.hekim && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{item.hekim}</span>}
                        </div>
                        <span className="text-xs text-slate-400">{tarihFormatla(item.tarih, true)}</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">Klinik Not</span>
                      {item.notlar && <ChevronDown size={14} className={clsx("text-slate-400 transition shrink-0", isAcik && "rotate-180")} />}
                    </button>
                    {isAcik && item.notlar && (
                      <div className="px-4 pb-3 border-t border-slate-50">
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mt-2 whitespace-pre-wrap leading-relaxed">{item.notlar}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.tip === "islem-notu") {
                const parsed = parseIslemNotu(item.not);
                const islemler = item.baslik?.split(",").map(b => b.trim()).filter(Boolean) ?? [];
                const hasDetail = !!(parsed.anestezi || parsed.sure_dk || parsed.asa || parsed.komplikasyon || parsed.not);
                return (
                  <div key={key} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => toggle(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.tur === "Ameliyat" ? "bg-rose-50" : "bg-sky-50")}>
                        <FileText size={15} className={item.tur === "Ameliyat" ? "text-rose-500" : "text-sky-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-800 block">{islemler.length > 0 ? islemler.join(", ") : "İsimsiz Not"}</span>
                        <span className="text-xs text-slate-400">{tarihFormatla(item.tarih)}</span>
                      </div>
                      <span className={clsx("text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0",
                        item.tur === "Ameliyat" ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-sky-50 text-sky-600 border-sky-200")}>
                        {item.tur ?? "İşlem"}
                      </span>
                      {hasDetail && <ChevronDown size={14} className={clsx("text-slate-400 transition shrink-0", isAcik && "rotate-180")} />}
                    </button>
                    {isAcik && hasDetail && (
                      <div className="px-4 pb-3 border-t border-slate-50">
                        {(parsed.anestezi || parsed.sure_dk || parsed.asa || parsed.komplikasyon) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 bg-slate-50 rounded-lg px-3 py-2 mt-2 mb-2">
                            {parsed.anestezi && <span className="text-xs text-slate-500">Anestezi: <span className="font-medium text-slate-700">{parsed.anestezi}</span></span>}
                            {parsed.sure_dk && <span className="text-xs text-slate-500">Süre: <span className="font-medium text-slate-700">{parsed.sure_dk} dk</span></span>}
                            {parsed.asa && <span className="text-xs text-slate-500">ASA: <span className="font-medium text-slate-700">{parsed.asa}</span></span>}
                            {parsed.komplikasyon && <span className="text-xs text-slate-500">Komplikasyon: <span className="font-medium text-slate-700">{parsed.komplikasyon}</span></span>}
                          </div>
                        )}
                        {parsed.not && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">{parsed.not}</p>}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const SEKMELER = [
  { key: "randevular", label: "Randevular", icon: CalendarCheck2 },
  { key: "notlar", label: "Klinik Notları", icon: NotebookPen },
  { key: "islem-notlari", label: "İşlem Notları", icon: FileText },
  { key: "fotograflar", label: "Fotoğraflar", icon: ImageIcon },
];

export default function HastaDetayPage() {
  const router = useRouter();
  const params = useParams();
  const [hasta, setHasta] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [aktifSekme, setAktifSekme] = useState("randevular");
  const [randevuSayisi, setRandevuSayisi] = useState<number | null>(null);
  const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);

  useEffect(() => {
    async function fetchHasta() {
      if (!params?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("hastalar").select("*").eq("id", params.id).single();
      if (error || !data) { setBulunamadi(true); } else { setHasta(data as Patient); }
      setLoading(false);
    }
    fetchHasta();
  }, [params?.id]);

  useEffect(() => {
    if (!hasta?.id) return;
    supabase.from("randevular").select("id", { count: "exact", head: true }).eq("hasta_id", hasta.id)
      .then(({ count }) => setRandevuSayisi(count ?? 0));
  }, [hasta?.id]);

  async function handleDurumChange(durum: string) {
    if (!hasta) return;
    await supabase.from("hastalar").update({ durum }).eq("id", hasta.id);
    setHasta((prev) => prev ? { ...prev, durum } : prev);
  }

  async function handlePuanChange(v: number) {
    if (!hasta) return;
    await supabase.from("hastalar").update({ doktor_puani: v }).eq("id", hasta.id);
    setHasta((prev) => prev ? { ...prev, doktor_puani: v } : prev);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <span className="text-sm text-slate-500">Hasta bilgileri yükleniyor...</span>
      </div>
    </div>
  );

  if (bulunamadi || !hasta) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center max-w-sm">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Hasta Bulunamadı</h2>
        <p className="text-slate-500 text-sm mb-5">Bu hasta kaydı silinmiş veya mevcut değil.</p>
        <button onClick={() => router.push("/hastalar/hasta-listesi")}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition">
          Listeye Dön
        </button>
      </div>
    </div>
  );

  const yas = yasHesapla(hasta.dogum_tarihi);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 pt-5 pb-0">

          <button
            onClick={() => router.push("/hastalar/hasta-listesi")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition mb-4 text-sm"
          >
            <ArrowLeft size={15} /> Hasta Listesi
          </button>

          <div className="flex gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
              {initials(hasta.ad_soyad)}
            </div>

            {/* Temel Bilgi */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 leading-tight">{hasta.ad_soyad}</h1>
                <span className="text-xs font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                  {hasta.dosya_no ? `DNY-${String(hasta.dosya_no).padStart(4, "0")}` : "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-sm mb-3">
                {yas !== null && <span>{yas} yaş</span>}
                {hasta.cinsiyet && <><span className="text-slate-300">·</span><span>{hasta.cinsiyet}</span></>}
                {hasta.ulke && <><span className="text-slate-300">·</span><span>{hasta.ulke}</span></>}
                {hasta.dogum_tarihi && (
                  <><span className="text-slate-300">·</span>
                  <span>{new Date(hasta.dogum_tarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</span></>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(hasta.etiketler || []).map((t) => (
                  <span key={t} className={clsx("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", TAG_STYLES[t] ?? "bg-slate-100 border-slate-200 text-slate-600")}>
                    {t}
                  </span>
                ))}
                <span className={clsx("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", DURUM_STYLES[hasta.durum ?? ""] ?? "bg-slate-100 border-slate-200 text-slate-600")}>
                  {hasta.durum || "Belirsiz"}
                </span>
              </div>
            </div>

            {/* Aksiyon */}
            <div className="flex gap-2 shrink-0 pt-1">
              <button onClick={() => setDuzenleModalAcik(true)}
                className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-4 py-2.5 rounded-xl transition">
                <Pencil size={15} /> Düzenle
              </button>
              {hasta.telefon && (
                <a
                  href={`https://wa.me/${hasta.telefon.replace(/\D/g, "").replace(/^\+/, "")}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-0 border-t border-slate-100 mt-4">
            {[
              { label: "Toplam Randevu", value: randevuSayisi !== null ? String(randevuSayisi) : "...", icon: CalendarCheck2 },
              { label: "Son Randevu", value: hasta.son_randevu_tarihi ? tarihFormatla(hasta.son_randevu_tarihi) : "Yok", icon: Clock },
              { label: "Kayıt Tarihi", value: tarihFormatla(hasta.created_at), icon: Calendar },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 py-3 pr-6">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <s.icon size={14} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider leading-none mb-0.5">{s.label}</p>
                  <p className="text-slate-800 text-sm font-semibold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── İÇERİK ─── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* SOL: Hasta Bilgi Kartı */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* İletişim & Klinik */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Hasta Bilgileri</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { icon: Phone, label: "Telefon", value: hasta.telefon ? (hasta.telefon.startsWith("+") ? hasta.telefon : `+90 ${hasta.telefon.replace(/^0/, "")}`) : "-" },
                  { icon: IdCard, label: "TC Kimlik / Pasaport", value: hasta.tc_kimlik || "-" },
                  { icon: Briefcase, label: "Meslek", value: hasta.meslek || "Belirtilmemiş" },
                  { icon: Stethoscope, label: "Son İşlem", value: hasta.islem || "Belirtilmemiş" },
                  { icon: MapPin, label: "Ülke", value: hasta.ulke || "Türkiye" },
                  { icon: Share2, label: "Nasıl Ulaştı?", value: formatReferansGorunum(hasta.referans) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium break-all">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Doktor Değerlendirmesi */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Doktor Değerlendirmesi</h3>
              <div className="flex items-center gap-3">
                <StarRating value={hasta.doktor_puani} onChange={handlePuanChange} size={22} />
                {hasta.doktor_puani && (
                  <span className="text-sm font-bold text-amber-500">{hasta.doktor_puani}/5</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Bu değerlendirme yalnızca doktora görünür.</p>
            </div>

            {/* Genel Notlar */}
            {hasta.notlar && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> Genel Notlar
                </h3>
                <p className="text-sm text-amber-900 leading-relaxed">{hasta.notlar}</p>
              </div>
            )}

            {/* Sonraki Randevu */}
            <SonrakiRandevuWidget hastaId={hasta.id} hastaAdi={hasta.ad_soyad} hastaTelefon={hasta.telefon} />

            {/* Tedavi Hedefleri — flex-1 ile ödeme takibi hizasına uzanır */}
            <TedaviHedefleriWidget hastaId={hasta.id} className="flex-1" />
          </div>

          {/* SAĞ: Sekmeler + Ödeme Takibi */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Sekme Bar */}
              <div className="flex border-b border-slate-200 bg-slate-50/60">
                {SEKMELER.map((s) => {
                  const Icon = s.icon;
                  const aktif = aktifSekme === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setAktifSekme(s.key)}
                      className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-3.5 text-sm font-semibold border-b-2 transition-all",
                        aktif
                          ? "border-blue-500 text-blue-700 bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Icon size={15} className={clsx("shrink-0", aktif ? "text-blue-500" : "text-slate-400")} />
                      <span className="whitespace-nowrap">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sekme İçeriği */}
              <div className="p-6">
                {aktifSekme === "randevular" && (
                  <RandevularTab hastaId={hasta.id} hastaAdi={hasta.ad_soyad} hastaTelefon={hasta.telefon} />
                )}
                {aktifSekme === "notlar" && (
                  <KlinikNotlariTab hastaId={hasta.id} />
                )}
                {aktifSekme === "islem-notlari" && (
                  <IslemNotlariTab hastaId={hasta.id} />
                )}
                {aktifSekme === "fotograflar" && (
                  <FotograflarTab hastaId={hasta.id} />
                )}
              </div>
            </div>

            {/* Ödeme Takibi */}
            <OdemeTakibiPanel hastaId={hasta.id} durum={hasta.durum} onDurumChange={handleDurumChange} />
          </div>

        </div>

        {/* ─── ARŞİV ─── */}
        <div className="mt-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Archive size={15} className="text-slate-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 text-sm leading-tight">Hasta Arşivi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tüm randevu, not ve işlem kayıtları kronolojik sırayla</p>
              </div>
            </div>
            <div className="p-6">
              <ArşivTab hastaId={hasta.id} />
            </div>
          </div>
        </div>

      </div>

      {duzenleModalAcik && (
        <HastaDuzenleModal
          hasta={hasta}
          onClose={() => setDuzenleModalAcik(false)}
          onSaved={(updated) => { setHasta(updated); setDuzenleModalAcik(false); }}
        />
      )}
    </div>
  );
}
