"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { UserRound, Phone, IdCard, Stethoscope, BadgePercent, ArrowLeft, ImageIcon, NotebookPen, CalendarCheck2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

// Hasta durumuna göre renkler
const durumRenkleri: Record<string, string> = {
  "Ödeme Bekliyor": "bg-yellow-50 text-yellow-800 ring-yellow-300",
  "Tamamlandı": "bg-green-50 text-green-700 ring-green-300",
  "İptal": "bg-red-50 text-red-700 ring-red-200",
};

function getDurumStili(durum: string | null) {
  if (!durum) return "bg-slate-50 text-slate-500 ring-slate-100";
  return durumRenkleri[durum] || "bg-blue-50 text-blue-700 ring-blue-200";
}

const sekmeler = [
  { key: "fotograflar", label: "Fotoğraflar", icon: ImageIcon },
  { key: "notlar", label: "Klinik Notları", icon: NotebookPen },
  { key: "randevular", label: "Randevular", icon: CalendarCheck2 },
];

export default function HastaDetayPage() {
  const router = useRouter();
  const params = useParams();
  const [hasta, setHasta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aktifSekme, setAktifSekme] = useState("fotograflar");
  const [bulunamadi, setBulunamadi] = useState(false);

  useEffect(() => {
    async function fetchHasta() {
      if (!params?.id) return;
      setLoading(true);
      setBulunamadi(false);

      // ID'ye göre hastayı çekiyoruz
      const { data, error } = await supabase
        .from("hastalar")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        console.error("Hata:", error);
        setBulunamadi(true);
        setHasta(null);
      } else {
        setHasta(data);
      }
      setLoading(false);
    }
    fetchHasta();
  }, [params?.id]);

  // DÜZELTME: ad_soyad tek sütun olduğu için avatarı buradan üretiyoruz
  function hastaAvatar(adSoyad: string) {
    if (!adSoyad) return "";
    return adSoyad
      .trim()
      .split(" ")
      .map((w) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }

  // Kart Bilgi Bileşeni
  function KartBilgi({
    icon: Icon,
    label,
    children,
  }: {
    icon: any;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex items-center gap-3 mb-3 last:mb-0">
        <span className="flex items-center justify-center bg-blue-50 text-blue-600 rounded-md w-8 h-8 ring-1 ring-blue-100 shrink-0">
          <Icon size={18} />
        </span>
        <div className="overflow-hidden">
          <div className="text-xs text-blue-400 leading-none mb-0.5">{label}</div>
          <div className="font-medium text-slate-700 truncate">{children}</div>
        </div>
      </div>
    );
  }

  // Sekme Butonları
  function Sekmeler() {
    return (
      <div className="flex gap-2 mb-6 border-b border-slate-100 pb-1 overflow-x-auto">
        {sekmeler.map((sekme) => {
          const Icon = sekme.icon;
          const aktif = aktifSekme === sekme.key;
          return (
            <button
              key={sekme.key}
              onClick={() => setAktifSekme(sekme.key)}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-5 py-3 font-semibold border-b-2 transition-all whitespace-nowrap",
                aktif
                  ? "border-blue-500 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-slate-50"
              )}
              type="button"
            >
              <Icon size={18} className={aktif ? "text-blue-500" : "text-slate-400"} />
              {sekme.label}
            </button>
          );
        })}
      </div>
    );
  }

  // İçerik Alanları
  function SekmeIcerik() {
    switch (aktifSekme) {
      case "fotograflar":
        return (
          <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <ImageIcon size={32} className="text-blue-300" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">Fotoğraf Galerisi Boş</h3>
            <p className="text-slate-500 text-sm mb-6">Henüz bu hasta için öncesi/sonrası fotoğrafı yüklenmemiş.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 font-medium transition shadow-lg shadow-blue-600/20 flex items-center gap-2">
              <ImageIcon size={18} />
              Fotoğraf Yükle
            </button>
          </div>
        );
      case "notlar":
        return (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <NotebookPen size={40} className="mx-auto mb-3 opacity-20" />
            Henüz klinik notu eklenmemiş.
          </div>
        );
      case "randevular":
        return (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <CalendarCheck2 size={40} className="mx-auto mb-3 opacity-20" />
            Planlanmış randevu bulunmuyor.
          </div>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center animate-pulse">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <div className="text-sm text-blue-600 font-medium">Hasta bilgileri getiriliyor...</div>
        </div>
      </div>
    );
  }

  if (bulunamadi) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Hasta Bulunamadı</h2>
          <p className="text-slate-500 mb-6">Aradığınız hasta kaydı silinmiş veya taşınmış olabilir.</p>
          <button
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition"
            onClick={() => router.back()}
          >
            Listeye Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Geri Dön Butonu */}
        <button
          onClick={() => router.push("/genel-bakis/hasta-listesi")}
          className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors w-fit"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
             <ArrowLeft size={16} />
          </div>
          <span>Listeye Dön</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SOL KOLON: Hasta Kartı (4 birim genişlik) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-8">
              {/* Avatar Alanı */}
              <div className="bg-slate-900/5 p-8 flex flex-col items-center border-b border-slate-100">
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-4 ring-4 ring-white shadow-lg text-3xl font-bold text-blue-600">
                  {hasta?.ad_soyad ? hastaAvatar(hasta.ad_soyad) : <UserRound size={40} />}
                </div>
                <h1 className="text-xl font-bold text-slate-800 text-center">{hasta?.ad_soyad}</h1>
                <span className="text-sm text-slate-500 mt-1">Hasta ID: #{hasta?.id}</span>
              </div>
              
              {/* Bilgiler */}
              <div className="p-6 space-y-6">
                <KartBilgi icon={Phone} label="Telefon">
                  {hasta?.telefon || "Belirtilmemiş"}
                </KartBilgi>
                <KartBilgi icon={IdCard} label="TC Kimlik">
                  {hasta?.tc_kimlik || "–"}
                </KartBilgi>
                <KartBilgi icon={Stethoscope} label="Son İşlem">
                  {hasta?.islem || "İşlem Yok"}
                </KartBilgi>
                
                <div className="pt-4 border-t border-slate-50">
                   <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Ödeme Durumu</div>
                   <span className={clsx("px-3 py-1.5 rounded-lg text-sm font-bold block text-center w-full", getDurumStili(hasta?.durum))}>
                      {hasta?.durum || "Belirsiz"}
                   </span>
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ KOLON: Sekmeler (8 birim genişlik) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[600px]">
              <Sekmeler />
              <SekmeIcerik />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}