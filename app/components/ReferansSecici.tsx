"use client";

import clsx from "clsx";

export const REFERANS_SECENEKLER = [
  { key: "Instagram",          emoji: "📸" },
  { key: "Google",             emoji: "🔍" },
  { key: "Arkadaş / Tanıdık", emoji: "🤝" },
  { key: "Doktor Tavsiyesi",  emoji: "🩺" },
  { key: "Facebook",          emoji: "📘" },
  { key: "TikTok",            emoji: "🎵" },
  { key: "Diğer",             emoji: "✏️" },
] as const;

export function formatReferansGorunum(r: string | null): string {
  if (!r) return "Belirtilmemiş";
  if (r.startsWith("Diğer: ")) return `✏️ ${r.slice(7)}`;
  const found = REFERANS_SECENEKLER.find(s => s.key === r);
  return found ? `${found.emoji} ${r}` : r;
}

export function ReferansSecici({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const isDigerSelected = value?.startsWith("Diğer") ?? false;
  const secim = !value ? "" : isDigerSelected ? "Diğer" : value;
  const digerText = value?.startsWith("Diğer: ") ? value.slice(7) : "";

  function handleSecim(key: string) {
    if (secim === key) { onChange(null); return; }
    onChange(key === "Diğer" ? "Diğer" : key);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {REFERANS_SECENEKLER.map(s => (
          <button
            key={s.key}
            type="button"
            disabled={disabled}
            onClick={() => handleSecim(s.key)}
            className={clsx(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition select-none",
              secim === s.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
            )}
          >
            <span className="text-sm leading-none">{s.emoji}</span>
            {s.key}
          </button>
        ))}
      </div>
      {secim === "Diğer" && (
        <input
          key="diger-input"
          type="text"
          defaultValue={digerText}
          onChange={e => onChange(e.target.value.trim() ? `Diğer: ${e.target.value}` : "Diğer")}
          placeholder="Lütfen belirtin..."
          disabled={disabled}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}
    </div>
  );
}
