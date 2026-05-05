"use client";

import { Gift } from "lucide-react";

export default function SadakatProgramiYapimAsamasinda() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-5">
        <Gift
          size={72}
          className="text-blue-200 mb-4 drop-shadow"
          strokeWidth={1.5}
        />
        <h1 className="text-2xl md:text-3xl font-bold text-blue-700 mb-1">
          Sadakat Programı
        </h1>
        <p className="text-slate-500 text-base md:text-lg font-medium">
          Bu sayfa henüz düzenleme aşamasındadır.
        </p>
      </div>
    </div>
  );
}
