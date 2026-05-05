"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  UserPlus,
  FileText,
  Camera,
  BarChart3,
  PieChart,
  Banknote,
  MessageSquareQuote,
  Gift,
  Settings,
  Package,
  Wallet,
  MessageSquare, // Yeni ikon: Yorumlar için eklendi
  Building2, // Eklendi: Klinik Ayarları için
} from "lucide-react";

// HREF'ler güncellendi!
const menuGroups = [
  {
    heading: "RANDEVULAR",
    items: [
      { name: "Klinik Listesi", icon: Calendar, href: "/randevular/klinik-listesi" },
      { name: "Ameliyat Listesi", icon: ClipboardList, href: "/randevular/ameliyat-listesi" },
      { name: "Tüm Randevular", icon: Calendar, href: "/randevular/tum-randevular" },
    ],
  },
  {
    heading: "HASTALAR",
    items: [
      { name: "Hasta Listesi", icon: Users, href: "/hastalar/hasta-listesi" },
      { name: "Yeni Hasta", icon: UserPlus, href: "/hastalar/yeni-hasta" },
    ],
  },
  {
    heading: "TIBBİ KAYITLAR",
    items: [
      { name: "Ameliyat / İşlem Notları", icon: FileText, href: "/tibbi-kayitlar/ameliyat-islem-notlari" },
      { 
        name: "Fotoğraf / Video Galerisi", 
        icon: Camera,
        href: "/tibbi-kayitlar/fotograf-video-galerisi"
      },
    ],
  },
  {
    heading: "RAPORLAR",
    items: [
      { name: "İstatistikler", icon: PieChart, href: "/raporlar/istatistikler" },
      { name: "Stok Takibi", icon: Package, href: "/raporlar/stok-takibi" },
      { name: "Finans", icon: Wallet, href: "/raporlar/finans" },
    ],
  },
  {
    heading: "HASTA PORTALI",
    items: [
      { name: "Yorumlar", icon: MessageSquare, href: "/hasta-portali/yorumlar" },
      { name: "Sadakat Programı", icon: Gift, href: "/hasta-portali/sadakat-programi" },
    ],
  },
  {
    heading: "AYARLAR",
    items: [
      { name: "Klinik Ayarları", icon: Building2, href: "/ayarlar/klinik-ayarlari" },
      { name: "Sistem Ayarları", icon: Settings, href: "/ayarlar/sistem-ayarlari" },
    ],
  },
];

export default function Sidebar() {
  // Başlangıçta tüm gruplar açık olsun
  const [openGroups, setOpenGroups] = useState<string[]>(
    menuGroups.map((g) => g.heading)
  );

  const pathname = usePathname();

  const toggleGroup = (heading: string) => {
    setOpenGroups((prev) =>
      prev.includes(heading)
        ? prev.filter((h) => h !== heading)
        : [...prev, heading]
    );
  };

  return (
    <div className="w-72 bg-blue-50 text-white flex flex-col h-full border-r border-blue-100 shadow-xl overflow-hidden">
      {/* HEADER & PROFIL ALANI */}
      <div className="p-6 pb-2">
        {/* Logo */}
        <h1 className="text-2xl font-bold tracking-tight mb-6 select-none flex items-center">
          <span className="text-blue-900">Estetik</span>
          <span className="mx-1" /> {/* Boşluk ekle */}
          <span className="text-blue-600">Asistan</span>
        </h1>

        {/* Profil Kartı */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 mb-4">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold border-2 border-slate-100 text-blue-700">
            OD
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Dr. Oğuzhan Durmuş</p>
            <p className="text-xs text-slate-400">Doktor</p>
          </div>
        </div>
      </div>

      {/* MENÜ (SCROLL EDİLEBİLİR) */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-thin scrollbar-thumb-slate-200">
        {/* SABİT MENÜ: GENEL BAKIŞ (Accordion değil, direkt link) */}
        <div className="mb-6">
          <Link
            href="/genel-bakis"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm ${
              pathname === "/genel-bakis"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            style={
              pathname === "/genel-bakis"
                ? { boxShadow: "0 1px 2px 0 rgba(16,42,87,0.05)" }
                : undefined
            }
          >
            <LayoutDashboard
              size={20}
              className={pathname === "/genel-bakis" ? "text-blue-600" : "text-slate-400"}
            />
            <span>Genel Bakış</span>
          </Link>
        </div>

        {/* GRUPLU MENÜLER */}
        <div className="space-y-1">
          {menuGroups.map((group) => {
            const isOpen = openGroups.includes(group.heading);
            return (
              <div key={group.heading} className="mb-2">
                {/* Grup Başlığı */}
                <button
                  onClick={() => toggleGroup(group.heading)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider mb-1"
                  type="button"
                >
                  {group.heading}
                  {isOpen ? (
                    <ChevronDown size={14} className="text-slate-300" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-300" />
                  )}
                </button>

                {/* Grup İçeriği (Animasyonlu) */}
                <div
                  className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ml-2 border-l-2 ${
                          isActive
                            ? "bg-white text-blue-600 border-blue-600 shadow-sm"
                            : "text-slate-600 border-transparent hover:bg-slate-100"
                        }`}
                        style={
                          isActive
                            ? { boxShadow: "0 1px 2px 0 rgba(16,42,87,0.05)" }
                            : undefined
                        }
                      >
                        <item.icon
                          size={18}
                          strokeWidth={2}
                          className={isActive ? "text-blue-600" : "text-slate-400"}
                        />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}