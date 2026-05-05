"use client";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  MoreHorizontal
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function formatTurkishDate(dateObj: Date) {
  // Tarihi: "23 Kasım 2025, Pazar" gibi döndürür
  return dateObj.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
}

export default function DashboardPage() {
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [todayDate, setTodayDate] = useState<string>("...");
  
  useEffect(() => {
    // 1- Hasta sayısını çek
    let cancelled = false;
    async function fetchCount() {
      const { count, error } = await supabase
        .from("hastalar")
        .select("*", { count: "exact", head: true });
      if (!cancelled) {
        setPatientCount(typeof count === "number" ? count : 0);
      }
    }
    fetchCount();
    // 2- Tarihi formatla
    const today = new Date();
    setTodayDate(formatTurkishDate(today));
    return () => { cancelled = true; }
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      {/* Üst Başlık */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Genel Bakış</h1>
          <p className="text-slate-500 mt-1">Hoşgeldiniz Dr. Oğuzhan, bugün klinik oldukça hareketli.</p>
        </div>
        <div className="text-sm text-slate-400 font-medium bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          {todayDate}
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Kart 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] 
                        hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={14} className="mr-1" /> %{patientCount !== null ? Math.min(patientCount, 100) : 0}
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Toplam Hasta</h3>
          <p className="text-3xl font-bold text-slate-800 mt-1">{patientCount !== null ? patientCount : "..."}</p>
        </div>

        {/* Kart 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] 
                        hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              Stabil
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Bekleyen İşlemler</h3>
          <p className="text-3xl font-bold text-slate-800 mt-1">8</p>
        </div>

        {/* Kart 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] 
                        hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CreditCard size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={14} className="mr-1" /> %8
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Günlük Tahmini Gelir</h3>
          <p className="text-3xl font-bold text-slate-800 mt-1">₺15.750</p>
        </div>
      </div>

      {/* Randevu Listesi ve Yan Alan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sol Geniş Alan: Randevular */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Bugünkü Randevular</h2>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">Tümünü Gör</button>
          </div>

          <div className="space-y-4">
            {/* Randevu Item 1 */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  AY
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Ayşe Yılmaz</h4>
                  <p className="text-sm text-slate-500">Botoks</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    <CheckCircle2 size={14} className="mr-1.5" /> Onaylandı
                 </span>
                 <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">09:00</p>
                    <p className="text-xs text-slate-400">45 dk</p>
                 </div>
              </div>
            </div>

            {/* Randevu Item 2 */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  MK
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Mehmet Kaya</h4>
                  <p className="text-sm text-slate-500">Konsültasyon</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="flex items-center text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                    <Clock size={14} className="mr-1.5" /> Bekliyor
                 </span>
                 <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">10:30</p>
                    <p className="text-xs text-slate-400">30 dk</p>
                 </div>
              </div>
            </div>

             {/* Randevu Item 3 */}
             <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  ZD
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Zeynep Demir</h4>
                  <p className="text-sm text-slate-500">Dolgu (Dudak)</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    <CheckCircle2 size={14} className="mr-1.5" /> Onaylandı
                 </span>
                 <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">14:00</p>
                    <p className="text-xs text-slate-400">60 dk</p>
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sağ Dar Alan: Son Aktiviteler */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 text-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Son İşlemler</h2>
            <MoreHorizontal className="text-slate-400" />
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="mt-1 min-w-[8px] h-2 w-2 rounded-full bg-blue-400 ring-4 ring-blue-500/20"></div>
              <div>
                <p className="text-sm font-medium text-slate-800">Yeni randevu oluşturuldu</p>
                <p className="text-xs text-slate-500 mt-0.5">Ayşe Yılmaz • 5 dk önce</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 min-w-[8px] h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20"></div>
              <div>
                <p className="text-sm font-medium text-slate-800">Ödeme alındı (₺4.500)</p>
                <p className="text-xs text-slate-500 mt-0.5">Ahmet K. • 15 dk önce</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 min-w-[8px] h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-500/20"></div>
              <div>
                <p className="text-sm font-medium text-slate-800">Stok uyarısı: Botoks</p>
                <p className="text-xs text-slate-500 mt-0.5">Son 2 kutu kaldı • 1 saat önce</p>
              </div>
            </div>
          </div>

          <button className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
            Tüm Raporu Gör
          </button>
        </div>
      </div>
    </div>
  );
}