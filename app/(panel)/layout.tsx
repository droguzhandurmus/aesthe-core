"use client";

import React from "react";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // DEĞİŞİKLİK BURADA: bg-slate-50 yaptık (Tüm zemin açık gri oldu)
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar sabit sol tarafta */}
      <Sidebar />
      
      {/* Sağda içerik alanı */}
      {/* main kısmının arka planını şeffaf veya aynı renk yapıyoruz */}
      <main className="flex-1 h-full overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}