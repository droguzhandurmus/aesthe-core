"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { 
  ArrowLeft, Save, User, Phone, Stethoscope, Loader2, Tag 
} from "lucide-react";
import clsx from "clsx";

// Sabit Etiket Listesi
const ETIKET_SECENEKLERI = ["VIP", "Düzenli", "Eski", "Komplikasyon", "Yabancı", "İndirimli"];

export default function YeniHastaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    ad_soyad: "",
    telefon: "",
    tc_kimlik: "",
    cinsiyet: "Seçiniz",
    dogum_tarihi: "",
    ulke: "Türkiye",
    islem: "Seçiniz",
    notlar: ""
  });

  // Seçili etiketleri tutan state (Array)
  const [seciliEtiketler, setSeciliEtiketler] = useState<string[]>([]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleEtiket = (etiket: string) => {
    setSeciliEtiketler(prev => 
      prev.includes(etiket) ? prev.filter(t => t !== etiket) : [...prev, etiket]
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("hastalar").insert([
      {
        ad_soyad: formData.ad_soyad,
        telefon: formData.telefon,
        tc_kimlik: formData.tc_kimlik,
        cinsiyet: formData.cinsiyet === "Seçiniz" ? null : formData.cinsiyet,
        dogum_tarihi: formData.dogum_tarihi || null,
        ulke: formData.ulke,
        islem: formData.islem === "Seçiniz" ? null : formData.islem,
        etiketler: seciliEtiketler, // Array olarak gönderiyoruz
        notlar: formData.notlar,
        durum: "Ödeme Bekliyor"
      }
    ]);

    if (error) {
      alert("Hata: " + error.message);
    } else {
      router.push("/hastalar/hasta-listesi");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Yeni Hasta Kaydı</h1>
            <p className="text-slate-500 text-sm">Hasta kartı oluşturun ve etiketleyin.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SOL: Kimlik & İletişim */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-6 pb-2 border-b border-slate-100">
                <User size={20} className="text-blue-500" /> Kimlik Bilgileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad *</label>
                  <input required name="ad_soyad" value={formData.ad_soyad} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                  <input name="telefon" value={formData.telefon} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="05XX..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TC Kimlik</label>
                  <input name="tc_kimlik" value={formData.tc_kimlik} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="TCKN" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doğum Tarihi</label>
                  <input type="date" name="dogum_tarihi" value={formData.dogum_tarihi} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cinsiyet</label>
                  <select name="cinsiyet" value={formData.cinsiyet} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500">
                    <option>Seçiniz</option>
                    <option>Kadın</option>
                    <option>Erkek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ülke</label>
                  <select name="ulke" value={formData.ulke} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500">
                    <option>Türkiye</option>
                    <option>Almanya</option>
                    <option>İngiltere</option>
                    <option>Diğer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ: İşlem & Etiketler */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-6 pb-2 border-b border-slate-100">
                <Stethoscope size={20} className="text-purple-500" /> Detaylar
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">İşlem</label>
                  <select name="islem" value={formData.islem} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500">
                    <option>Seçiniz</option>
                    <option>Botoks</option>
                    <option>Dolgu</option>
                    <option>Rinoplasti</option>
                    <option>Ameliyat</option>
                  </select>
                </div>

                {/* YENİ ETİKET SİSTEMİ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Tag size={14} /> Etiketler
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ETIKET_SECENEKLERI.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleEtiket(tag)}
                        className={clsx(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                          seciliEtiketler.includes(tag)
                            ? "bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-200 ring-offset-1"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notlar</label>
                  <textarea name="notlar" value={formData.notlar} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-none" placeholder="Kısa notlar..." />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Kaydet
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}