"use client";

import { useState, useEffect } from "react";
import {
  Inbox, Clock, User, Phone, Stethoscope, Check, X,
  CalendarPlus, AlertCircle, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

type Basvuru = {
  id: string;
  ad_soyad: string;
  telefon: string | null;
  islem: string | null;
  notlar: string | null;
  basvuru_tarihi: string;
  durum: string;
};

function tarihFormatla(tarih: string) {
  return new Date(tarih).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function gecenSure(tarih: string): string {
  const diff = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(diff / 60000);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.floor(sa / 24)} gün önce`;
}

// Mock veri — gerçek portal entegrasyonu yapılana kadar örnek gösterim
const MOCK_BASVURULAR: Basvuru[] = [
  {
    id: "mock-1",
    ad_soyad: "Ayşe Kaya",
    telefon: "05301234567",
    islem: "Rinoplasti",
    notlar: "Burun ucu düzeltme için bilgi almak istiyorum.",
    basvuru_tarihi: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durum: "Bekliyor",
  },
  {
    id: "mock-2",
    ad_soyad: "Mehmet Demir",
    telefon: "05429876543",
    islem: "Botoks",
    notlar: null,
    basvuru_tarihi: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    durum: "Bekliyor",
  },
];

export default function BavsurularPage() {
  const [basvurular, setBasvurular] = useState<Basvuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalAktif] = useState(false); // İleride true yapılacak

  useEffect(() => {
    async function fetchBasvurular() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("hasta_basvurulari")
          .select("*")
          .eq("durum", "Bekliyor")
          .order("basvuru_tarihi", { ascending: false });
        setBasvurular(data ?? []);
      } catch {
        // Tablo henüz oluşturulmamış olabilir — mock göster
        setBasvurular([]);
      }
      setLoading(false);
    }
    fetchBasvurular();
  }, []);

  async function handleOnayla(id: string) {
    // İleride: hasta_basvurulari tablosundan alıp hastalar tablosuna ekleyecek
    // Şimdilik sadece durumu güncelle (tablo yoksa sessizce devam et)
    try {
      await supabase
        .from("hasta_basvurulari")
        .update({ durum: "Onaylandı", onay_tarihi: new Date().toISOString() })
        .eq("id", id);
      setBasvurular((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // sessiz hata
    }
  }

  async function handleReddet(id: string) {
    try {
      await supabase
        .from("hasta_basvurulari")
        .update({ durum: "Reddedildi" })
        .eq("id", id);
      setBasvurular((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // sessiz hata
    }
  }

  const gosterilecekler = portalAktif ? basvurular : MOCK_BASVURULAR;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bekleyen Başvurular</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hasta portalından gelen kayıt talepleri burada görüntülenir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gosterilecekler.length > 0 && (
            <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              <AlertCircle size={14} />
              {gosterilecekler.length} bekliyor
            </span>
          )}
        </div>
      </div>

      {/* PORTAL DURUM BANERI */}
      {!portalAktif && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Inbox size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">Hasta Portalı Henüz Aktif Değil</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Hasta portalı entegrasyonu tamamlandığında, kliniğinize kayıt olmak isteyen hastalar
              burada görünecek ve tek tıkla hasta listesine eklenebilecek.
              Aşağıda örnek bir görünüm sunulmaktadır.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw size={24} className="animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : gosterilecekler.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Bekleyen Başvuru Yok</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Hasta portalından yeni bir kayıt talebi geldiğinde burada görünecek.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gosterilecekler.map((b) => (
            <div
              key={b.id}
              className={clsx(
                "bg-white rounded-2xl border shadow-sm overflow-hidden transition",
                !portalAktif ? "opacity-70 border-slate-200" : "border-slate-200 hover:border-blue-200"
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                    {b.ad_soyad.trim().split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("")}
                  </div>

                  {/* Bilgiler */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800">{b.ad_soyad}</h3>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} /> {gecenSure(b.basvuru_tarihi)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {b.telefon && (
                        <span className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone size={13} className="text-slate-400" /> {b.telefon}
                        </span>
                      )}
                      {b.islem && (
                        <span className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Stethoscope size={13} className="text-slate-400" /> {b.islem}
                        </span>
                      )}
                    </div>

                    {b.notlar && (
                      <p className="mt-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        {b.notlar}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400 mt-2">
                      Başvuru: {tarihFormatla(b.basvuru_tarihi)}
                    </p>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => !portalAktif ? undefined : handleOnayla(b.id)}
                    disabled={!portalAktif}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition",
                      portalAktif
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                        : "bg-emerald-100 text-emerald-600 cursor-not-allowed"
                    )}
                  >
                    <Check size={16} /> Onayla & Hasta Listesine Ekle
                  </button>
                  <button
                    onClick={() => !portalAktif ? undefined : handleReddet(b.id)}
                    disabled={!portalAktif}
                    className={clsx(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition border",
                      portalAktif
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <X size={16} />
                  </button>
                </div>

                {!portalAktif && (
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    Hasta Portalı aktive edildiğinde butonlar çalışmaya başlayacak
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
