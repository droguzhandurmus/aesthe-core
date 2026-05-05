"use client";

import { MessageSquareDashed } from "lucide-react";

export default function YorumlarYapimAsamasinda() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <MessageSquareDashed
          size={72}
          className="text-slate-400 mb-4 drop-shadow"
          strokeWidth={1.5}
        />
        <h1 className="text-2xl md:text-3xl font-bold text-blue-700 mb-1">
          Yorumlar ve Geri Bildirimler
        </h1>
        <p className="text-slate-500 text-base md:text-lg font-medium">
          Bu sayfa henüz düzenleme aşamasındadır.
        </p>
      </div>
    </div>
  );
}
