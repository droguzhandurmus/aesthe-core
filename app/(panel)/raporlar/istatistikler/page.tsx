"use client";

import React from "react";
import {
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  PieChart,
  BarChart3,
  AreaChart as LucideAreaChart
} from "lucide-react";
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  BarChart as ReBarChart,
  Bar,
} from "recharts";
import clsx from "clsx";

// Medical blue color palette
const BLUE_PRIMARY = "#3b82f6"; // sky-500
const BLUE_SECONDARY = "#60a5fa"; // sky-400
const BLUE_ACCENT = "#2563eb"; // blue-600

// --- Mock Data (Gerçekçi Yapıda) ---

// KPIs (stat cards)
const KPIS = [
  {
    title: "Toplam Hasta",
    value: 193,
    icon: Users,
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    border: "border-blue-200",
  },
  {
    title: "Bu Ayki Randevular",
    value: 62,
    icon: Calendar,
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    border: "border-sky-200",
  },
  {
    title: "Tahmini Gelir",
    value: 233800,
    icon: CreditCard,
    iconBg: "bg-blue-100",
    iconText: "text-blue-500",
    border: "border-blue-200",
    isMoney: true,
  },
  {
    title: "Aylık Büyüme",
    value: 12,
    icon: TrendingUp,
    iconBg: "bg-green-100",
    iconText: "text-green-600",
    border: "border-green-200",
    isPercent: true,
  },
];

// (Ay, Hasta Sayısı, Gelir)
const areaChartData = [
  { ay: "Oca", hasta: 29, gelir: 45500 },
  { ay: "Şub", hasta: 38, gelir: 61600 },
  { ay: "Mar", hasta: 52, gelir: 80100 },
  { ay: "Nis", hasta: 43, gelir: 71000 },
  { ay: "May", hasta: 56, gelir: 94000 },
  { ay: "Haz", hasta: 62, gelir: 119500 },
];

// İşlem Dağılımı (Donut)
const procedureDistribution = [
  { name: "Botoks", value: 68 },
  { name: "Dolgu", value: 44 },
  { name: "Ameliyat", value: 28 },
  { name: "PRP", value: 20 },
  { name: "Mezoterapi", value: 9 },
];

// En Popüler İşlemler
const populerIslemler = [
  { islem: "Botoks", sayi: 68 },
  { islem: "Dolgu", sayi: 44 },
  { islem: "Ameliyat", sayi: 28 },
  { islem: "PRP", sayi: 20 },
  { islem: "Mezoterapi", sayi: 9 },
  { islem: "Cilt Bakımı", sayi: 7 },
];

// Donut chart medical blue palette
const COLORS = [
  "#3b82f6", // Botoks - medical blue
  "#1e40af", // Dolgu - blue-900
  "#06b6d4", // Ameliyat - cyan-500
  "#a78bfa", // PRP - purple-400
  "#f59e42", // Mezoterapi - orange-400
];

// Helper to format currency
function formatTRY(num: number) {
  return num.toLocaleString("tr-TR") + " ₺";
}

export default function IstatistiklerPage() {
  // --- Responsive Grid Classes ---
  const gridColKPI = "grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4";
  const gridColMid = "lg:grid-cols-3 gap-6";
  const gridColBot = "grid-cols-1";

  return (
    <div className="p-4 md:p-8 bg-slate-50/50 min-h-screen overflow-x-auto">
      {/* BAŞLIK */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Klinik Performans Paneli</h1>
        <p className="text-slate-500">
          Klinik verilerinizi analiz edin, trendleri yakalayın ve gelişmeleri takip edin!
        </p>
      </div>

      {/* KPI KARTLARI */}
      <div className={clsx("grid", gridColKPI, "mb-8")}>
        {KPIS.map((kpi, i) => (
          <div
            key={kpi.title}
            className={clsx(
              "bg-white border shadow-sm rounded-xl flex items-center gap-4 p-5",
              kpi.border
            )}
          >
            <div className={clsx("p-3 rounded-xl", kpi.iconBg, kpi.iconText)}>
              <kpi.icon size={28} />
            </div>
            <div>
              <div className="text-slate-600 text-sm">{kpi.title}</div>
              <div className="text-3xl flex items-center font-bold text-slate-800">
                {kpi.isMoney
                  ? formatTRY(kpi.value)
                  : kpi.isPercent
                    ? (<span className="flex items-center gap-1 text-green-600">
                        <ArrowUpRight size={20} />
                        %{kpi.value}
                      </span>)
                    : kpi.value
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ORTA KISIM */}
      <div className={clsx("grid", gridColMid, "mb-8")}>
        {/* Area Chart: Gelir & Hasta */}
        <div className="col-span-2 bg-white border border-slate-100 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
            <LucideAreaChart size={20} className="text-blue-500" />
            Aylık Gelir & Hasta Grafiği
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ReAreaChart data={areaChartData} margin={{ left: 6, right: 14, top: 22, bottom: 6 }}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE_PRIMARY} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={BLUE_PRIMARY} stopOpacity={0.08}/>
                </linearGradient>
                <linearGradient id="colorHasta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE_SECONDARY} stopOpacity={0.7}/>
                  <stop offset="95%" stopColor={BLUE_SECONDARY} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                orientation="left"
                width={40}
                axisLine={false}
                tickLine={false}
                stroke="#334155"
              />
              <YAxis
                yAxisId="right"
                tick={{ fontSize: 12 }}
                orientation="right"
                width={40}
                hide
              />
              <CartesianGrid strokeDasharray="2 8" vertical={false} stroke="#f1f5f9" />
              <Tooltip
                formatter={(v: number, n: string) => n === "gelir" ? formatTRY(v) : v + " hasta"}
                wrapperClassName="!rounded-lg !bg-slate-50"
              />
              <Area
                type="monotone"
                dataKey="gelir"
                name="Gelir"
                yAxisId="left"
                stroke={BLUE_PRIMARY}
                fill="url(#colorGelir)"
                strokeWidth={3}
                dot={{ r: 4, fill: BLUE_PRIMARY }}
                activeDot={{ r: 6, fill: BLUE_PRIMARY }}
              />
              <Area
                type="monotone"
                dataKey="hasta"
                name="Hasta"
                yAxisId="right"
                stroke={BLUE_SECONDARY}
                fill="url(#colorHasta)"
                strokeWidth={3}
                dot={{ r: 4, fill: BLUE_SECONDARY }}
                activeDot={{ r: 6, fill: BLUE_SECONDARY }}
              />
              <Legend
                verticalAlign="top"
                content={({ payload }) =>
                  <div className="flex items-center gap-5 mt-[-18px] ml-2">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-2 rounded-full inline-block" style={{ background: BLUE_PRIMARY }} />
                      Gelir
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-2 rounded-full inline-block" style={{ background: BLUE_SECONDARY }} />
                      Hasta
                    </span>
                  </div>
                }
              />
            </ReAreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart: İşlem Dağılımı */}
        <div className="col-span-1 flex flex-col bg-white border border-slate-100 rounded-xl shadow-sm p-6 min-h-[340px]">
          <div className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-fuchsia-500" />
            İşlem Dağılımı
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <RePieChart>
              <Pie
                data={procedureDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={4}
                label={({ name, percent }) =>
                  percent !== undefined && percent > 0.13 ? `${name}` : ""
                }
                stroke="#fff"
                labelLine={false}
              >
                {procedureDistribution.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: 13, bottom: -20 }}
              />
              <Tooltip formatter={(v: number, n: string) => [`${v} işlem`, n]} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ALT KISIM */}
      <div className={clsx("grid", gridColBot)}>
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6">
          <div className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-cyan-500" />
            En Popüler İşlemler
          </div>
          <ResponsiveContainer width="100%" height={205}>
            <ReBarChart
              layout="vertical"
              data={populerIslemler}
              margin={{ left: 12, right: 24, top: 10, bottom: 6 }}
              barSize={18}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="islem"
                width={115}
                tick={{ fill: "#334155", fontSize: 15, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="sayi" radius={[9, 9, 9, 9]}>
                {populerIslemler.map((entry, idx) => (
                  <Cell key={entry.islem} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
              <Tooltip formatter={(v: number) => `${v} adet`} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
