"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, LoaderCircle, Camera, X, Plus, Check, Tag,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Star, GripVertical, Calendar, User, Stethoscope, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import { PhoneInput } from "@/app/components/PhoneInput";
import { ReferansSecici } from "@/app/components/ReferansSecici";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DEFAULT_PINNED_COUNTRIES = ["Türkiye", "Almanya", "Fransa", "ABD", "İngiltere"];

type UlkeEntry = { flag: string; name: string };
type UlkeGrubu = { label: string; countries: UlkeEntry[] };

const COUNTRY_GROUPS: UlkeGrubu[] = [
  {
    label: "Avrupa",
    countries: [
      { flag: "🇩🇪", name: "Almanya" }, { flag: "🇦🇩", name: "Andorra" },
      { flag: "🇦🇱", name: "Arnavutluk" }, { flag: "🇦🇹", name: "Avusturya" },
      { flag: "🇧🇾", name: "Belarus" }, { flag: "🇧🇪", name: "Belçika" },
      { flag: "🇧🇦", name: "Bosna Hersek" }, { flag: "🇧🇬", name: "Bulgaristan" },
      { flag: "🇨🇿", name: "Çek Cumhuriyeti" }, { flag: "🇩🇰", name: "Danimarka" },
      { flag: "🇪🇪", name: "Estonya" }, { flag: "🇫🇮", name: "Finlandiya" },
      { flag: "🇫🇷", name: "Fransa" }, { flag: "🇭🇷", name: "Hırvatistan" },
      { flag: "🇳🇱", name: "Hollanda" }, { flag: "🇬🇧", name: "İngiltere" },
      { flag: "🇮🇪", name: "İrlanda" }, { flag: "🇪🇸", name: "İspanya" },
      { flag: "🇸🇪", name: "İsveç" }, { flag: "🇨🇭", name: "İsviçre" },
      { flag: "🇮🇹", name: "İtalya" }, { flag: "🇮🇸", name: "İzlanda" },
      { flag: "🇲🇪", name: "Karadağ" }, { flag: "🇨🇾", name: "Kıbrıs" },
      { flag: "🇽🇰", name: "Kosova" }, { flag: "🇲🇰", name: "Kuzey Makedonya" },
      { flag: "🇱🇻", name: "Letonya" }, { flag: "🇱🇮", name: "Lihtenştayn" },
      { flag: "🇱🇹", name: "Litvanya" }, { flag: "🇱🇺", name: "Lüksemburg" },
      { flag: "🇭🇺", name: "Macaristan" }, { flag: "🇲🇹", name: "Malta" },
      { flag: "🇲🇩", name: "Moldova" }, { flag: "🇲🇨", name: "Monako" },
      { flag: "🇳🇴", name: "Norveç" }, { flag: "🇵🇱", name: "Polonya" },
      { flag: "🇵🇹", name: "Portekiz" }, { flag: "🇷🇴", name: "Romanya" },
      { flag: "🇷🇺", name: "Rusya" }, { flag: "🇸🇲", name: "San Marino" },
      { flag: "🇷🇸", name: "Sırbistan" }, { flag: "🇸🇰", name: "Slovakya" },
      { flag: "🇸🇮", name: "Slovenya" }, { flag: "🇹🇷", name: "Türkiye" },
      { flag: "🇺🇦", name: "Ukrayna" }, { flag: "🇻🇦", name: "Vatikan" },
      { flag: "🇬🇷", name: "Yunanistan" },
    ],
  },
  {
    label: "Orta Doğu & Kafkasya",
    countries: [
      { flag: "🇦🇪", name: "BAE" }, { flag: "🇧🇭", name: "Bahreyn" },
      { flag: "🇦🇲", name: "Ermenistan" }, { flag: "🇵🇸", name: "Filistin" },
      { flag: "🇬🇪", name: "Gürcistan" }, { flag: "🇮🇶", name: "Irak" },
      { flag: "🇮🇷", name: "İran" }, { flag: "🇮🇱", name: "İsrail" },
      { flag: "🇰🇼", name: "Kuveyt" }, { flag: "🇱🇧", name: "Lübnan" },
      { flag: "🇴🇲", name: "Umman" }, { flag: "🇶🇦", name: "Katar" },
      { flag: "🇸🇦", name: "Suudi Arabistan" }, { flag: "🇸🇾", name: "Suriye" },
      { flag: "🇾🇪", name: "Yemen" }, { flag: "🇦🇿", name: "Azerbaycan" },
      { flag: "🇯🇴", name: "Ürdün" },
    ],
  },
  {
    label: "Orta Asya",
    countries: [
      { flag: "🇦🇫", name: "Afganistan" }, { flag: "🇰🇿", name: "Kazakistan" },
      { flag: "🇰🇬", name: "Kırgızistan" }, { flag: "🇹🇯", name: "Tacikistan" },
      { flag: "🇹🇲", name: "Türkmenistan" }, { flag: "🇺🇿", name: "Özbekistan" },
    ],
  },
  {
    label: "Doğu & Güneydoğu Asya",
    countries: [
      { flag: "🇧🇳", name: "Brunei" }, { flag: "🇰🇭", name: "Kamboçya" },
      { flag: "🇨🇳", name: "Çin" }, { flag: "🇹🇱", name: "Doğu Timor" },
      { flag: "🇮🇩", name: "Endonezya" }, { flag: "🇯🇵", name: "Japonya" },
      { flag: "🇰🇵", name: "Kuzey Kore" }, { flag: "🇰🇷", name: "Güney Kore" },
      { flag: "🇱🇦", name: "Laos" }, { flag: "🇲🇾", name: "Malezya" },
      { flag: "🇲🇳", name: "Moğolistan" }, { flag: "🇲🇲", name: "Myanmar" },
      { flag: "🇵🇭", name: "Filipinler" }, { flag: "🇸🇬", name: "Singapur" },
      { flag: "🇹🇼", name: "Tayvan" }, { flag: "🇹🇭", name: "Tayland" },
      { flag: "🇻🇳", name: "Vietnam" },
    ],
  },
  {
    label: "Güney Asya",
    countries: [
      { flag: "🇧🇩", name: "Bangladeş" }, { flag: "🇧🇹", name: "Butan" },
      { flag: "🇮🇳", name: "Hindistan" }, { flag: "🇲🇻", name: "Maldivler" },
      { flag: "🇳🇵", name: "Nepal" }, { flag: "🇵🇰", name: "Pakistan" },
      { flag: "🇱🇰", name: "Sri Lanka" },
    ],
  },
  {
    label: "Afrika",
    countries: [
      { flag: "🇩🇿", name: "Cezayir" }, { flag: "🇦🇴", name: "Angola" },
      { flag: "🇧🇯", name: "Benin" }, { flag: "🇧🇼", name: "Botsvana" },
      { flag: "🇧🇫", name: "Burkina Faso" }, { flag: "🇧🇮", name: "Burundi" },
      { flag: "🇨🇻", name: "Yeşil Burun Adaları" }, { flag: "🇨🇫", name: "Orta Afrika Cum." },
      { flag: "🇩🇯", name: "Cibuti" }, { flag: "🇹🇩", name: "Çad" },
      { flag: "🇨🇩", name: "Dem. Kongo" }, { flag: "🇨🇬", name: "Kongo" },
      { flag: "🇨🇮", name: "Fildişi Sahili" }, { flag: "🇨🇲", name: "Kamerun" },
      { flag: "🇪🇬", name: "Mısır" }, { flag: "🇬🇶", name: "Ekvator Ginesi" },
      { flag: "🇪🇷", name: "Eritre" }, { flag: "🇸🇿", name: "Esvatini" },
      { flag: "🇪🇹", name: "Etiyopya" }, { flag: "🇲🇦", name: "Fas" },
      { flag: "🇬🇦", name: "Gabon" }, { flag: "🇬🇲", name: "Gambiya" },
      { flag: "🇬🇭", name: "Gana" }, { flag: "🇬🇳", name: "Gine" },
      { flag: "🇬🇼", name: "Gine-Bissau" }, { flag: "🇰🇪", name: "Kenya" },
      { flag: "🇰🇲", name: "Komorlar" }, { flag: "🇱🇸", name: "Lesoto" },
      { flag: "🇱🇷", name: "Liberya" }, { flag: "🇱🇾", name: "Libya" },
      { flag: "🇲🇬", name: "Madagaskar" }, { flag: "🇲🇼", name: "Malavi" },
      { flag: "🇲🇱", name: "Mali" }, { flag: "🇲🇷", name: "Moritanya" },
      { flag: "🇲🇺", name: "Mauritius" }, { flag: "🇲🇿", name: "Mozambik" },
      { flag: "🇳🇦", name: "Namibya" }, { flag: "🇳🇪", name: "Nijer" },
      { flag: "🇳🇬", name: "Nijerya" }, { flag: "🇷🇼", name: "Ruanda" },
      { flag: "🇸🇹", name: "São Tomé ve Príncipe" }, { flag: "🇸🇳", name: "Senegal" },
      { flag: "🇸🇱", name: "Sierra Leone" }, { flag: "🇸🇴", name: "Somali" },
      { flag: "🇿🇦", name: "Güney Afrika" }, { flag: "🇸🇸", name: "Güney Sudan" },
      { flag: "🇸🇩", name: "Sudan" }, { flag: "🇹🇿", name: "Tanzanya" },
      { flag: "🇹🇬", name: "Togo" }, { flag: "🇹🇳", name: "Tunus" },
      { flag: "🇺🇬", name: "Uganda" }, { flag: "🇿🇲", name: "Zambiya" },
      { flag: "🇿🇼", name: "Zimbabve" },
    ],
  },
  {
    label: "Kuzey & Orta Amerika",
    countries: [
      { flag: "🇺🇸", name: "ABD" }, { flag: "🇧🇸", name: "Bahamalar" },
      { flag: "🇧🇧", name: "Barbados" }, { flag: "🇧🇿", name: "Belize" },
      { flag: "🇨🇦", name: "Kanada" }, { flag: "🇨🇷", name: "Kosta Rika" },
      { flag: "🇨🇺", name: "Küba" }, { flag: "🇩🇲", name: "Dominika" },
      { flag: "🇩🇴", name: "Dominik Cumhuriyeti" }, { flag: "🇸🇻", name: "El Salvador" },
      { flag: "🇬🇩", name: "Grenada" }, { flag: "🇬🇹", name: "Guatemala" },
      { flag: "🇭🇹", name: "Haiti" }, { flag: "🇭🇳", name: "Honduras" },
      { flag: "🇯🇲", name: "Jamaika" }, { flag: "🇲🇽", name: "Meksika" },
      { flag: "🇳🇮", name: "Nikaragua" }, { flag: "🇵🇦", name: "Panama" },
      { flag: "🇰🇳", name: "Saint Kitts ve Nevis" }, { flag: "🇱🇨", name: "Saint Lucia" },
      { flag: "🇻🇨", name: "Saint Vincent" }, { flag: "🇹🇹", name: "Trinidad ve Tobago" },
    ],
  },
  {
    label: "Güney Amerika",
    countries: [
      { flag: "🇦🇷", name: "Arjantin" }, { flag: "🇧🇴", name: "Bolivya" },
      { flag: "🇧🇷", name: "Brezilya" }, { flag: "🇨🇱", name: "Şili" },
      { flag: "🇨🇴", name: "Kolombiya" }, { flag: "🇪🇨", name: "Ekvador" },
      { flag: "🇬🇾", name: "Guyana" }, { flag: "🇵🇾", name: "Paraguay" },
      { flag: "🇵🇪", name: "Peru" }, { flag: "🇸🇷", name: "Surinam" },
      { flag: "🇺🇾", name: "Uruguay" }, { flag: "🇻🇪", name: "Venezuela" },
    ],
  },
  {
    label: "Okyanusya",
    countries: [
      { flag: "🇦🇺", name: "Avustralya" }, { flag: "🇫🇯", name: "Fiji" },
      { flag: "🇰🇮", name: "Kiribati" }, { flag: "🇲🇭", name: "Marshall Adaları" },
      { flag: "🇫🇲", name: "Mikronezya" }, { flag: "🇳🇷", name: "Nauru" },
      { flag: "🇳🇿", name: "Yeni Zelanda" }, { flag: "🇵🇼", name: "Palau" },
      { flag: "🇵🇬", name: "Papua Yeni Gine" }, { flag: "🇼🇸", name: "Samoa" },
      { flag: "🇸🇧", name: "Solomon Adaları" }, { flag: "🇹🇴", name: "Tonga" },
      { flag: "🇹🇻", name: "Tuvalu" }, { flag: "🇻🇺", name: "Vanuatu" },
    ],
  },
];

const ALL_COUNTRIES: UlkeEntry[] = COUNTRY_GROUPS.flatMap(g => g.countries);

const BASE_ISLEM_LIST = [
  "Botoks", "Dolgu", "Rinoplasti", "Göz Kapağı", "Liposuction", "Meme Estetiği",
  "Kulak Estetiği", "Yüz Germe", "Karın Germe", "Burun Ucu", "Jinekomasti",
  "Mezoterapi", "PRP", "Lazer", "Peeling", "İplik", "Karboksiterapi", "Hydrafacial",
];

const BASE_ETIKET_LIST = ["VIP", "Düzenli", "Eski", "Komplikasyon", "Yabancı", "İndirimli"];

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700 border-purple-200",
  Düzenli: "bg-blue-100 text-blue-700 border-blue-200",
  Eski: "bg-gray-100 text-gray-700 border-gray-200",
  Komplikasyon: "bg-red-100 text-red-700 border-red-200",
  Yabancı: "bg-orange-100 text-orange-700 border-orange-200",
  İndirimli: "bg-green-100 text-green-700 border-green-200",
};

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAY_HEADERS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return (parts[0][0] ?? "").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

// ─── SmartDateInput ───────────────────────────────────────────────────────────

function SmartDateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yy, setYy] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear() - 30);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYearEdit, setCalYearEdit] = useState(false);
  const [calYearInp, setCalYearInp] = useState("");
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });
  const mmRef = useRef<HTMLInputElement>(null);
  const yyRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      setYy(y ?? ""); setMm(m ?? ""); setDd(d ?? "");
    } else { setDd(""); setMm(""); setYy(""); }
  }, [value]);

  useEffect(() => {
    if (!showCal) return;
    const onDown = (e: MouseEvent) => {
      if (!calRef.current?.contains(e.target as Node) && !wrapperRef.current?.contains(e.target as Node))
        setShowCal(false);
    };
    const onScroll = () => setShowCal(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("scroll", onScroll, true); };
  }, [showCal]);

  function emit(d: string, m: string, y: string) {
    const mn = parseInt(m, 10), dn = parseInt(d, 10);
    if (y.length === 4 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31)
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    else onChange("");
  }

  function resolveYear(raw: string): string {
    if (!raw || raw.length > 2) return raw;
    const n = parseInt(raw, 10);
    const cur2 = new Date().getFullYear() % 100;
    return String(n <= cur2 ? 2000 + n : 1900 + n);
  }

  function handleDay(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 2);
    const n = parseInt(clean, 10);
    if (clean === "" || (n >= 1 && n <= 31)) { setDd(clean); if (clean.length === 2) mmRef.current?.focus(); }
  }
  function handleMonth(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 2);
    const n = parseInt(clean, 10);
    if (clean === "" || (n >= 1 && n <= 12)) { setMm(clean); if (clean.length === 2) yyRef.current?.focus(); }
  }
  function handleYearBlur() {
    const resolved = resolveYear(yy);
    setYy(resolved); emit(dd, mm, resolved);
  }

  function openCal() {
    if (showCal) { setShowCal(false); return; }
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setCalPos({ top: rect.bottom + 4, left: rect.left });
    if (value) {
      const [y, m] = value.split("-");
      setCalYear(parseInt(y) || new Date().getFullYear() - 30);
      setCalMonth((parseInt(m) - 1) || 0);
    } else {
      setCalYear(new Date().getFullYear() - 30);
      setCalMonth(new Date().getMonth());
    }
    setCalYearEdit(false);
    setShowCal(true);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1);
  }
  function selectDay(day: number) {
    const mStr = String(calMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const yStr = String(calYear);
    setDd(dStr); setMm(mStr); setYy(yStr);
    onChange(`${yStr}-${mStr}-${dStr}`);
    setShowCal(false);
  }

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOffset(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

  const selDay = value ? parseInt(value.split("-")[2]) : null;
  const selMon = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selYr = value ? parseInt(value.split("-")[0]) : null;
  const isCurView = selYr === calYear && selMon === calMonth;
  const today = new Date();

  return (
    <div ref={wrapperRef}>
      <div className="flex items-center border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400 bg-white gap-1 text-slate-700 text-sm">
        <input type="text" inputMode="numeric" placeholder="GG" value={dd} maxLength={2}
          onChange={e => handleDay(e.target.value)} onBlur={() => emit(dd, mm, yy)}
          className="w-7 text-center outline-none" />
        <span className="text-slate-300">/</span>
        <input ref={mmRef} type="text" inputMode="numeric" placeholder="AA" value={mm} maxLength={2}
          onChange={e => handleMonth(e.target.value)} onBlur={() => emit(dd, mm, yy)}
          className="w-7 text-center outline-none" />
        <span className="text-slate-300">/</span>
        <input ref={yyRef} type="text" inputMode="numeric" placeholder="YYYY" value={yy} maxLength={4}
          onChange={e => setYy(e.target.value.replace(/\D/g, ""))}
          onBlur={handleYearBlur}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleYearBlur(); } }}
          className="w-12 text-center outline-none" />
        <button type="button" onClick={openCal} title="Takvimden seç"
          className={clsx("ml-auto p-0.5 rounded transition", showCal ? "text-blue-500" : "text-slate-400 hover:text-blue-500")}>
          <Calendar size={14} />
        </button>
      </div>

      {showCal && (
        <div ref={calRef} style={{ position: "fixed", top: calPos.top, left: calPos.left, zIndex: 10100, width: 252 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setCalYear(y => y - 1)} title="Önceki yıl"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                <ChevronsLeft size={14} />
              </button>
              <button type="button" onClick={prevMonth} title="Önceki ay"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-sm select-none">
              <span className="font-semibold text-slate-700">{MONTHS_TR[calMonth]}</span>
              {calYearEdit
                ? <input autoFocus type="text" inputMode="numeric" value={calYearInp}
                    onChange={e => setCalYearInp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onBlur={() => { const y = parseInt(calYearInp, 10); if (y >= 1900 && y <= 2100) setCalYear(y); setCalYearEdit(false); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); const y = parseInt(calYearInp, 10); if (y >= 1900 && y <= 2100) setCalYear(y); setCalYearEdit(false); }
                      if (e.key === "Escape") setCalYearEdit(false);
                    }}
                    className="w-14 text-center border-b border-blue-400 outline-none bg-transparent text-blue-700 font-bold text-sm"
                  />
                : <button type="button" onClick={() => { setCalYearInp(String(calYear)); setCalYearEdit(true); }}
                    className="font-bold text-blue-700 hover:underline decoration-blue-300 text-sm">
                    {calYear}
                  </button>
              }
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={nextMonth} title="Sonraki ay"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                <ChevronRight size={14} />
              </button>
              <button type="button" onClick={() => setCalYear(y => y + 1)} title="Sonraki yıl"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-0.5">
            {DAY_HEADERS.map(d => <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array(firstDayOffset(calYear, calMonth)).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth(calYear, calMonth)).fill(null).map((_, i) => {
              const day = i + 1;
              const isSel = isCurView && selDay === day;
              const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
              return (
                <button key={day} type="button" onClick={() => selectDay(day)}
                  className={clsx("text-xs py-1.5 rounded-lg transition font-medium text-center",
                    isSel ? "bg-blue-600 text-white shadow-sm" :
                    isToday ? "bg-blue-50 text-blue-700 font-bold" :
                    "hover:bg-slate-100 text-slate-700")}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UlkeCombobox ─────────────────────────────────────────────────────────────

function UlkeCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addInp, setAddInp] = useState("");
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ulke_sabitler") ?? "null") ?? DEFAULT_PINNED_COUNTRIES; }
    catch { return DEFAULT_PINNED_COUNTRIES; }
  });
  const [customCountries, setCustomCountries] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ozel_ulkeler") ?? "[]"); } catch { return []; }
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const cRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setSearch(""); setAddInp(""); return; }
    setTimeout(() => searchRef.current?.focus(), 50);
    const h = (e: MouseEvent) => { if (cRef.current && !cRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const allFlat = useMemo<UlkeEntry[]>(() => [
    ...ALL_COUNTRIES,
    ...customCountries.map(name => ({ flag: "🌍", name })),
  ], [customCountries]);

  const findCountry = useCallback((name: string) => allFlat.find(c => c.name === name), [allFlat]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return null;
    return [
      ...COUNTRY_GROUPS.map(g => ({
        label: g.label,
        countries: g.countries.filter(c => c.name.toLocaleLowerCase("tr-TR").includes(q)),
      })),
      ...(customCountries.some(n => n.toLocaleLowerCase("tr-TR").includes(q))
        ? [{ label: "Özel Ülkeler", countries: customCountries.filter(n => n.toLocaleLowerCase("tr-TR").includes(q)).map(n => ({ flag: "🌍", name: n })) }]
        : []),
    ].filter(g => g.countries.length > 0);
  }, [search, customCountries]);

  const selected = findCountry(value);

  function savePinned(next: string[]) { setPinned(next); localStorage.setItem("ulke_sabitler", JSON.stringify(next)); }
  function togglePin(name: string) { savePinned(pinned.includes(name) ? pinned.filter(p => p !== name) : [...pinned, name]); }

  function addCustom() {
    const v = addInp.trim();
    if (!v || allFlat.some(c => c.name === v)) return;
    const next = [...customCountries, v];
    setCustomCountries(next);
    localStorage.setItem("ozel_ulkeler", JSON.stringify(next));
    onChange(v); setOpen(false); setAddInp("");
  }

  function removeCustom(name: string) {
    const next = customCountries.filter(c => c !== name);
    setCustomCountries(next);
    localStorage.setItem("ozel_ulkeler", JSON.stringify(next));
    if (pinned.includes(name)) savePinned(pinned.filter(p => p !== name));
    if (value === name) onChange("Türkiye");
  }

  function handleDragStart(e: React.DragEvent, idx: number) { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); if (dragOverIdx !== idx) setDragOverIdx(idx); }
  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...pinned]; const [item] = next.splice(dragIdx, 1); next.splice(idx, 0, item);
    savePinned(next); setDragIdx(null); setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  const displayGroups = filteredGroups ?? COUNTRY_GROUPS;

  return (
    <div ref={cRef} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={clsx("w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white transition text-left",
          open ? "ring-2 ring-blue-400 border-blue-300" : "border-slate-200 hover:border-slate-300")}>
        <span className="text-base leading-none">{selected?.flag ?? "🌍"}</span>
        <span className="flex-1 text-slate-700">{selected?.name ?? "Seçiniz"}</span>
        <ChevronDown size={14} className={clsx("text-slate-400 transition flex-shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 flex flex-col" style={{ maxHeight: 320 }}>
          <div className="p-2 border-b border-slate-100 flex-shrink-0">
            <input ref={searchRef} type="text" placeholder="Ülke ara..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="overflow-y-auto flex-1">
            {!search && pinned.length > 0 && (
              <div>
                {pinned.map((name, idx) => {
                  const c = findCountry(name);
                  if (!c) return null;
                  return (
                    <div key={name} draggable
                      onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)}
                      onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                      className={clsx("flex items-center gap-2 px-3 py-2 group/item transition select-none",
                        value === name ? "bg-blue-50" : "hover:bg-blue-50",
                        dragIdx === idx && "opacity-40",
                        dragOverIdx === idx && dragIdx !== idx && "border-t-2 border-blue-400")}>
                      <GripVertical size={13} className="text-slate-300 group-hover/item:text-slate-400 cursor-grab flex-shrink-0" />
                      <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left"
                        onMouseDown={e => { e.preventDefault(); onChange(name); setOpen(false); }}>
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className={clsx(value === name ? "font-semibold text-blue-700" : "text-slate-700")}>{name}</span>
                        {value === name && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                      </button>
                      <button type="button" onMouseDown={e => { e.preventDefault(); togglePin(name); }}
                        title="Sabitlemeyi Kaldır"
                        className="p-1 text-amber-400 hover:text-slate-300 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0">
                        <Star size={12} className="fill-amber-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {displayGroups.map(group => {
              const countries = group.countries.filter(c => search ? true : !pinned.includes(c.name));
              if (countries.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider sticky top-0">{group.label}</div>
                  {countries.map(c => (
                    <div key={c.name} className={clsx("flex items-center gap-2 px-3 py-2 group/item hover:bg-blue-50 transition", value === c.name && "bg-blue-50")}>
                      <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left"
                        onMouseDown={e => { e.preventDefault(); onChange(c.name); setOpen(false); }}>
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className={clsx(value === c.name ? "font-semibold text-blue-700" : "text-slate-700")}>{c.name}</span>
                        {value === c.name && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                      </button>
                      <button type="button" onMouseDown={e => { e.preventDefault(); togglePin(c.name); }}
                        title={pinned.includes(c.name) ? "Sabitlemeyi Kaldır" : "Sabitle"}
                        className="p-1 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0 text-slate-300 hover:text-amber-400">
                        <Star size={12} className={pinned.includes(c.name) ? "fill-amber-400 text-amber-400" : ""} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
            {!search && customCountries.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">Özel Ülkeler</div>
                {customCountries.filter(n => !pinned.includes(n)).map(name => (
                  <div key={name} className={clsx("flex items-center gap-2 px-3 py-2 group/item hover:bg-blue-50 transition", value === name && "bg-blue-50")}>
                    <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left"
                      onMouseDown={e => { e.preventDefault(); onChange(name); setOpen(false); }}>
                      <span className="text-base leading-none">🌍</span>
                      <span className={clsx(value === name ? "font-semibold text-blue-700" : "text-slate-700")}>{name}</span>
                      {value === name && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); togglePin(name); }}
                      className="p-1 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0 text-slate-300 hover:text-amber-400">
                      <Star size={12} className={pinned.includes(name) ? "fill-amber-400 text-amber-400" : ""} />
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); removeCustom(name); }}
                      title="Listeden Kaldır"
                      className="p-1 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0 text-slate-300 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {search && filteredGroups?.length === 0 && <div className="py-6 text-center text-slate-400 text-sm">Bulunamadı</div>}
          </div>
          <div className="border-t border-slate-100 px-3 py-2 flex gap-2 flex-shrink-0 bg-white rounded-b-lg">
            <input type="text" placeholder="Yeni ülke ekle..." value={addInp} onChange={e => setAddInp(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
              onClick={e => e.stopPropagation()} />
            <button type="button" onMouseDown={e => { e.preventDefault(); addCustom(); }}
              disabled={!addInp.trim() || allFlat.some(c => c.name === addInp.trim())}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40 flex-shrink-0">
              <Plus size={13} />Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IslemMultiSelect ─────────────────────────────────────────────────────────

function IslemMultiSelect({ selected, setSelected, options, setOptions }: {
  selected: string[]; setSelected: (v: string[]) => void; options: string[]; setOptions: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addInp, setAddInp] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmItem, setConfirmItem] = useState<string | null>(null);
  const cRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setSearch(""); setAddInp(""); setEditingItem(null); return; }
    const h = (e: MouseEvent) => { if (cRef.current && !cRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLocaleLowerCase("tr-TR");
    return options.filter(o => o.toLocaleLowerCase("tr-TR").includes(q));
  }, [options, search]);

  const toggle = (v: string) => setSelected(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  function addNew() {
    const v = addInp.trim();
    if (!v || options.includes(v)) return;
    const next = [...options, v];
    setOptions(next); setSelected([...selected, v]); setAddInp("");
  }

  function confirmEdit() {
    if (!editingItem) return;
    const nv = editVal.trim();
    if (!nv || nv === editingItem || options.includes(nv)) { setEditingItem(null); return; }
    setOptions(options.map(o => o === editingItem ? nv : o));
    if (selected.includes(editingItem)) setSelected(selected.map(s => s === editingItem ? nv : s));
    setEditingItem(null);
  }

  function doDelete(val: string) {
    setOptions(options.filter(o => o !== val));
    if (selected.includes(val)) setSelected(selected.filter(s => s !== val));
    setConfirmItem(null);
  }

  return (
    <>
      <div ref={cRef} className="relative">
        <div onClick={() => setOpen(v => !v)}
          className={clsx("flex flex-wrap items-center min-h-[40px] w-full border rounded-lg px-2.5 py-1.5 gap-1.5 bg-white cursor-pointer transition",
            open ? "ring-2 ring-blue-400 border-blue-300" : "border-slate-200")}>
          {selected.length === 0 && <span className="text-slate-400 text-sm py-0.5 flex-1">Seç veya ekle...</span>}
          {selected.map(v => (
            <span key={v} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {v}
              <button type="button" onClick={e => { e.stopPropagation(); setSelected(selected.filter(x => x !== v)); }} className="hover:bg-blue-100 rounded-full p-0.5"><X size={12} /></button>
            </span>
          ))}
          <ChevronDown size={14} className={clsx("ml-auto text-slate-400 transition flex-shrink-0", open && "rotate-180")} />
        </div>
        {open && (
          <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 flex flex-col" style={{ maxHeight: 300 }}>
            <div className="p-2 border-b border-slate-100 flex-shrink-0">
              <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                onClick={e => e.stopPropagation()} />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
              {filtered.length === 0 && <div className="py-4 text-center text-slate-400 text-sm">Bulunamadı</div>}
              {filtered.map(o => (
                <div key={o} className={clsx("flex items-center gap-2 px-3 py-2 group hover:bg-blue-50 transition", selected.includes(o) && "bg-blue-50")}>
                  {editingItem === o ? (
                    <input autoFocus type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmEdit(); } if (e.key === "Escape") setEditingItem(null); }}
                      onBlur={confirmEdit}
                      className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent py-0.5"
                      onClick={e => e.stopPropagation()} />
                  ) : (
                    <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left" onMouseDown={e => { e.preventDefault(); toggle(o); }}>
                      <input type="checkbox" checked={selected.includes(o)} readOnly className="accent-blue-600 flex-shrink-0" />
                      <span className={selected.includes(o) ? "font-semibold text-blue-700" : "text-slate-700"}>{o}</span>
                      {selected.includes(o) && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                    </button>
                  )}
                  {editingItem !== o && (
                    <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" onMouseDown={e => { e.preventDefault(); setEditingItem(o); setEditVal(o); }} title="Düzenle" className="p-1 text-slate-400 hover:text-blue-600 rounded transition"><Pencil size={12} /></button>
                      <button type="button" onMouseDown={e => { e.preventDefault(); setConfirmItem(o); }} title="Listeden Kaldır" className="p-1 text-slate-400 hover:text-red-500 rounded transition"><X size={12} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-3 py-2 flex gap-2 flex-shrink-0 bg-white rounded-b-lg">
              <input type="text" placeholder="Yeni işlem ekle..." value={addInp} onChange={e => setAddInp(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNew(); } }}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
                onClick={e => e.stopPropagation()} />
              <button type="button" onMouseDown={e => { e.preventDefault(); addNew(); }}
                disabled={!addInp.trim() || options.includes(addInp.trim())}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40 flex-shrink-0">
                <Plus size={13} />Ekle
              </button>
            </div>
          </div>
        )}
      </div>
      {confirmItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 p-6 flex flex-col gap-5">
            <p className="text-slate-700 text-sm font-medium text-center leading-relaxed">"{confirmItem}" işlemini listeden kaldırmak istediğinize emin misiniz?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
              <button onClick={() => doDelete(confirmItem)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold transition hover:bg-red-700">Kaldır</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── EtiketEditor ─────────────────────────────────────────────────────────────

function EtiketEditor({ selected, setSelected, allTags, setAllTags }: {
  selected: string[]; setSelected: (v: string[]) => void; allTags: string[]; setAllTags: (v: string[]) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [addInp, setAddInp] = useState("");

  function toggle(tag: string) { setSelected(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]); }

  function addTag() {
    const v = addInp.trim();
    if (!v || allTags.includes(v)) return;
    const next = [...allTags, v];
    setAllTags(next);
    localStorage.setItem("hasta_etiket_listesi", JSON.stringify(next));
    setSelected([...selected, v]); setAddInp("");
  }

  function removeTag(tag: string) {
    const next = allTags.filter(t => t !== tag);
    setAllTags(next);
    localStorage.setItem("hasta_etiket_listesi", JSON.stringify(next));
    if (selected.includes(tag)) setSelected(selected.filter(t => t !== tag));
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Tag size={12} className="text-slate-400" />
        <span className="text-xs font-medium text-slate-600">Etiketler</span>
        <button type="button" onClick={() => { setEditMode(v => !v); setAddInp(""); }}
          className={clsx("ml-auto text-xs font-semibold px-2 py-0.5 rounded-lg transition",
            editMode ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600")}>
          {editMode ? "Bitti" : "Düzenle"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map(tag => (
          <div key={tag} className="relative inline-flex">
            <button type="button" onClick={() => !editMode && toggle(tag)}
              className={clsx("px-2.5 py-1 rounded-full text-xs font-medium border transition",
                selected.includes(tag)
                  ? (TAG_STYLES[tag] ?? "bg-blue-100 text-blue-700 border-blue-200") + " ring-1 ring-offset-1 ring-blue-300"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300",
                editMode && "pr-5 cursor-default")}>
              {tag}
            </button>
            {editMode && (
              <button type="button" onClick={() => removeTag(tag)} title="Etiketi Sil"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-red-500 transition">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        {editMode && (
          <div className="flex gap-1 items-center">
            <input type="text" placeholder="Yeni etiket..." value={addInp} onChange={e => setAddInp(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              className="text-xs border border-slate-200 rounded-full px-2.5 py-1 outline-none focus:ring-1 focus:ring-blue-300 w-28" />
            <button type="button" onClick={addTag} disabled={!addInp.trim() || allTags.includes(addInp.trim())}
              className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40 flex items-center">
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────

export default function YeniHastaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ad_soyad: "", telefon: "", tc_kimlik: "", cinsiyet: "Seçiniz",
    dogum_tarihi: "", ulke: "Türkiye", meslek: "", notlar: "",
    referans: null as string | null,
  });
  const [selectedIslemler, setSelectedIslemler] = useState<string[]>([]);
  const [islemListesi, setIslemListesi] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hasta_islem_listesi") ?? "null") ?? BASE_ISLEM_LIST; } catch { return BASE_ISLEM_LIST; }
  });
  const [seciliEtiketler, setSeciliEtiketler] = useState<string[]>([]);
  const [etiketListesi, setEtiketListesi] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hasta_etiket_listesi") ?? "null") ?? BASE_ETIKET_LIST; } catch { return BASE_ETIKET_LIST; }
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [hata, setHata] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(formData.ad_soyad);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formData.ad_soyad.trim()) { setHata("Ad soyad zorunludur."); return; }
    setHata(""); setLoading(true);
    const { data, error } = await supabase.from("hastalar").insert([{
      ad_soyad: formData.ad_soyad.trim(),
      telefon: formData.telefon || null,
      tc_kimlik: formData.tc_kimlik || null,
      cinsiyet: formData.cinsiyet === "Seçiniz" ? null : formData.cinsiyet,
      dogum_tarihi: formData.dogum_tarihi || null,
      ulke: formData.ulke,
      islem: selectedIslemler.length > 0 ? selectedIslemler.join(", ") : null,
      etiketler: seciliEtiketler,
      notlar: formData.notlar || null,
      meslek: formData.meslek || null,
      referans: formData.referans || null,
      durum: "Ödeme Bekliyor",
    }]).select("id").single();
    if (error) { setLoading(false); setHata(error.message); return; }
    if (fotoFile && data?.id) {
      const ext = fotoFile.name.split(".").pop() ?? "jpg";
      const path = `profil/${data.id}_${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage.from("galeri").upload(path, fotoFile, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("galeri").getPublicUrl(path);
        await supabase.from("fotograflar").insert({ hasta_id: data.id, tip: "profil", url: urlData.publicUrl, aciklama: "Profil fotoğrafı" });
      }
    }
    setLoading(false);
    router.push("/hastalar/hasta-listesi");
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50/50 flex flex-col">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button type="button" onClick={() => router.back()}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">Yeni Hasta Kaydı</h1>
          <p className="text-xs text-slate-400">Hasta kartı oluşturun ve etiketleyin.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hata && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 max-w-xs truncate">{hata}</p>}
          <button type="button" onClick={() => router.back()} disabled={loading}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            İptal
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-60">
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-4">

        {/* Profil Kartı */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start gap-5">

            {/* Fotoğraf */}
            <div className="relative flex-shrink-0 group">
              <div onClick={() => fotoInputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition relative">
                {fotoPreview
                  ? <img src={fotoPreview} alt="Profil" className="w-full h-full object-cover" />
                  : initials
                    ? <span className="text-2xl font-bold text-blue-500 tracking-tight select-none">{initials}</span>
                    : <User size={30} className="text-blue-300" />
                }
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
              {fotoPreview ? (
                <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); if (fotoInputRef.current) fotoInputRef.current.value = ""; }}
                  title="Fotoğrafı Kaldır"
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow border border-white">
                  <X size={11} />
                </button>
              ) : (
                <button type="button" onClick={() => fotoInputRef.current?.click()}
                  title="Fotoğraf Ekle"
                  className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition shadow-sm border-2 border-white">
                  <Camera size={11} />
                </button>
              )}
            </div>

            {/* Ad + Telefon */}
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad <span className="text-red-500">*</span></label>
                <input required value={formData.ad_soyad} onChange={e => setFormData(p => ({ ...p, ad_soyad: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                <PhoneInput value={formData.telefon} onChange={val => setFormData(p => ({ ...p, telefon: val }))} disabled={loading} />
              </div>
            </div>

            {/* Etiketler */}
            <div className="w-56 flex-shrink-0">
              <EtiketEditor
                selected={seciliEtiketler} setSelected={setSeciliEtiketler}
                allTags={etiketListesi} setAllTags={v => { setEtiketListesi(v); localStorage.setItem("hasta_etiket_listesi", JSON.stringify(v)); }}
              />
            </div>

          </div>
        </div>

        {/* İki Sütun */}
        <div className="grid grid-cols-2 gap-4">

          {/* Kimlik Bilgileri */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <User size={13} /> Kimlik Bilgileri
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TC Kimlik / Pasaport No</label>
              <input value={formData.tc_kimlik} onChange={e => setFormData(p => ({ ...p, tc_kimlik: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="TCKN veya Pasaport" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cinsiyet</label>
              <select value={formData.cinsiyet} onChange={e => setFormData(p => ({ ...p, cinsiyet: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Seçiniz</option><option>Kadın</option><option>Erkek</option><option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Doğum Tarihi</label>
              <SmartDateInput value={formData.dogum_tarihi} onChange={v => setFormData(p => ({ ...p, dogum_tarihi: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ülke</label>
              <UlkeCombobox value={formData.ulke} onChange={v => setFormData(p => ({ ...p, ulke: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meslek</label>
              <input value={formData.meslek} onChange={e => setFormData(p => ({ ...p, meslek: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Meslek (isteğe bağlı)" />
            </div>
          </div>

          {/* Klinik Detaylar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Stethoscope size={13} /> Klinik Detaylar
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">İlgilendiği İşlem(ler)</label>
              <IslemMultiSelect
                selected={selectedIslemler} setSelected={setSelectedIslemler}
                options={islemListesi} setOptions={v => { setIslemListesi(v); localStorage.setItem("hasta_islem_listesi", JSON.stringify(v)); }}
              />
            </div>
            <div className="flex flex-col flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notlar</label>
              <textarea value={formData.notlar} onChange={e => setFormData(p => ({ ...p, notlar: e.target.value }))} rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="Hasta hakkında kısa notlar..." maxLength={600} />
            </div>
          </div>

        </div>

        {/* Nasıl Ulaştı? */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Kliniği Nasıl Öğrendi?
          </h3>
          <ReferansSecici
            value={formData.referans}
            onChange={v => setFormData(p => ({ ...p, referans: v }))}
          />
        </div>

      </div>
    </form>
  );
}
