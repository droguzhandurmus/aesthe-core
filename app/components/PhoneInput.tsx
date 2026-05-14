"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// ─── Desteklenen ülkeler ──────────────────────────────────────────────────────

const ULKELER = [
  { ad: "Türkiye",   kod: "+90",  bayrak: "🇹🇷", maxDigit: 10, placeholder: "555 555 55 55" },
  { ad: "Almanya",   kod: "+49",  bayrak: "🇩🇪", maxDigit: 12, placeholder: "176 1234 5678" },
  { ad: "İngiltere", kod: "+44",  bayrak: "🇬🇧", maxDigit: 10, placeholder: "7911 123456" },
  { ad: "ABD",       kod: "+1",   bayrak: "🇺🇸", maxDigit: 10, placeholder: "(555) 123-4567" },
  { ad: "Fransa",    kod: "+33",  bayrak: "🇫🇷", maxDigit: 9,  placeholder: "6 12 34 56 78" },
  { ad: "BAE",       kod: "+971", bayrak: "🇦🇪", maxDigit: 9,  placeholder: "50 123 4567" },
  { ad: "Diğer",     kod: "+",    bayrak: "🌐",  maxDigit: 15, placeholder: "xxx xxx xxxx" },
];

// ─── Türk numarasını formatla: 5551234567 → 555 555 55 55 ────────────────────

function formatTR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

// ─── Kayıtlı telefon stringini parse et ("+90 555 555 55 55" veya "05551234567")

export function parsePhone(full: string): { kod: string; numara: string } {
  if (!full) return { kod: "+90", numara: "" };
  for (const u of ULKELER) {
    if (u.kod !== "+" && full.startsWith(u.kod + " ")) {
      return { kod: u.kod, numara: full.slice(u.kod.length + 1) };
    }
  }
  // Eski format: 0555... → +90 555...
  if (/^0[5-9]\d{9}$/.test(full.replace(/\s/g, ""))) {
    const digits = full.replace(/\D/g, "").slice(1);
    return { kod: "+90", numara: formatTR(digits) };
  }
  return { kod: "+90", numara: full };
}

// ─── Telefon gösterim fonksiyonu ──────────────────────────────────────────────

export function formatPhoneDisplay(telefon: string | null): string {
  if (!telefon) return "-";
  const { kod, numara } = parsePhone(telefon);
  // Listede bitişik göster: "+90 5551234567"
  const compact = numara.replace(/\s/g, "");
  return compact ? `${kod}${compact}` : "-";
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, disabled = false }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [kod, setKod] = useState(parsed.kod);
  const [numara, setNumara] = useState(parsed.numara);
  const [dropOpen, setDropOpen] = useState(false);

  // Dışarıdan gelen value ile senkronize et (form reset gibi durumlarda)
  useEffect(() => {
    if (!value) { setKod("+90"); setNumara(""); return; }
    const p = parsePhone(value);
    setKod(p.kod);
    setNumara(p.numara);
  }, [value]);

  function handleNumaraChange(raw: string) {
    let formatted = raw;
    if (kod === "+90") {
      formatted = formatTR(raw);
    } else {
      // Diğer ülkeler: sadece rakam ve boşluk, max karakter
      const u = ULKELER.find((u) => u.kod === kod);
      const max = u?.maxDigit ?? 15;
      formatted = raw.replace(/[^\d\s\-()]/g, "").slice(0, max + 5);
    }
    setNumara(formatted);
    onChange(formatted ? `${kod} ${formatted}` : "");
  }

  function handleKodChange(newKod: string) {
    setKod(newKod);
    setNumara("");
    onChange("");
    setDropOpen(false);
  }

  const selectedUlke = ULKELER.find((u) => u.kod === kod) ?? ULKELER[0];

  return (
    <div className="flex gap-1.5">
      {/* Ülke kodu butonu */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropOpen((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 transition disabled:opacity-60 whitespace-nowrap"
        >
          <span className="text-base leading-none">{selectedUlke.bayrak}</span>
          <span className="text-slate-700 font-mono text-xs">{selectedUlke.kod}</span>
          <ChevronDown size={12} className="text-slate-400" />
        </button>
        {dropOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-44 overflow-hidden">
              {ULKELER.map((u) => (
                <button
                  key={u.kod}
                  type="button"
                  onClick={() => handleKodChange(u.kod)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition text-left"
                >
                  <span className="text-base">{u.bayrak}</span>
                  <span className="flex-1 text-slate-700">{u.ad}</span>
                  <span className="text-xs text-slate-400 font-mono">{u.kod}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Numara alanı */}
      <input
        type="tel"
        inputMode="numeric"
        value={numara}
        onChange={(e) => handleNumaraChange(e.target.value)}
        disabled={disabled}
        placeholder={selectedUlke.placeholder}
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono disabled:opacity-60"
        maxLength={20}
      />
    </div>
  );
}
