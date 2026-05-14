"use client";

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Filter, ArrowUpDown, MoreHorizontal, Plus, Columns,
  Download, Trash2, Pencil, Eye, X, Phone, Calendar, Check, Tag,
  LoaderCircle, Save, User, Stethoscope, Star, MessageCircle,
  Settings2, CalendarPlus, Globe, Users, TrendingUp, AlertCircle,
  UserCheck, GripVertical, RotateCcw, FolderOpen, Camera, ChevronDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import YeniRandevuModal from "../../randevular/components/YeniRandevuModal";
import { Tooltip } from "@/app/components/Tooltip";
import { PhoneInput, formatPhoneDisplay } from "@/app/components/PhoneInput";
import { ReferansSecici } from "@/app/components/ReferansSecici";

// ─── Types ───────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  dosya_no: number | null;
  ad_soyad: string;
  telefon: string;
  tc_kimlik: string;
  islem: string;
  durum: string;
  cinsiyet: string | null;
  dogum_tarihi: string | null;
  ulke: string | null;
  etiketler: string[] | null;
  son_randevu_tarihi: string | null;
  created_at: string;
  doktor_puani: number | null;
  hasta_puani: number | null;
  notlar: string | null;
};

// ─── Defaults (değiştirilebilir tüm ayarların varsayılanları) ─────────────────

const DEFAULT_VISIBLE_COLUMNS = {
  yas: true, cinsiyet: true, telefon: true, ulke: false,
  sonIslem: true, etiketler: true, memnuniyet: true, islem: true,
};
const DEFAULT_COLUMN_ORDER = ["yas", "cinsiyet", "telefon", "ulke", "sonIslem", "etiketler", "memnuniyet", "islem"];
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  adSoyad: 200, yas: 65, cinsiyet: 85, telefon: 130, ulke: 85, sonIslem: 150, etiketler: 160, memnuniyet: 110, islem: 90,
};
const DEFAULT_FILTER_VISIBLE = { cinsiyet: true, ulke: true, etiket: true, doktorPuani: true };
const DEFAULT_STATS_VISIBLE = { toplam: true, buAy: true, vip: true, takip: true };

const LS_KEY = "hl_settings_v1";

// ─── Constants ───────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700 border-purple-200",
  Düzenli: "bg-blue-100 text-blue-700 border-blue-200",
  Eski: "bg-gray-100 text-gray-700 border-gray-200",
  Komplikasyon: "bg-red-100 text-red-700 border-red-200",
  Yabancı: "bg-orange-100 text-orange-700 border-orange-200",
  İndirimli: "bg-green-100 text-green-700 border-green-200",
};

const TAG_LIST = ["VIP", "Düzenli", "Eski", "Komplikasyon", "Yabancı", "İndirimli"];
const BASE_ETIKET_LIST = ["VIP", "Düzenli", "Eski", "Komplikasyon", "Yabancı", "İndirimli"];
const BASE_ISLEM_LIST = [
  "Botoks", "Dolgu", "Rinoplasti", "Göz Kapağı", "Liposuction", "Meme Estetiği",
  "Kulak Estetiği", "Yüz Germe", "Karın Germe", "Burun Ucu", "Jinekomasti",
  "Mezoterapi", "PRP", "Lazer", "Peeling", "İplik", "Karboksiterapi", "Hydrafacial",
];
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
const ULKE_LIST = ALL_COUNTRIES.map(c => c.name);

const COL_LABELS: Record<string, string> = {
  yas: "Yaş", cinsiyet: "Cinsiyet", telefon: "Telefon", ulke: "Ülke",
  sonIslem: "Son İşlem", etiketler: "Etiketler", memnuniyet: "Memnuniyet", islem: "İşlemler",
};
const COL_HEADERS: Record<string, string> = {
  yas: "YAŞ", cinsiyet: "CİNSİYET", telefon: "TELEFON", ulke: "ÜLKE",
  sonIslem: "SON İŞLEM", etiketler: "ETİKETLER", memnuniyet: "MEMNUNİYET", islem: "İŞLEMLER",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { gte: start.toISOString(), lt: end.toISOString() };
}

function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const start = new Date(monday.setHours(0, 0, 0, 0));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { gte: start.toISOString(), lt: end.toISOString() };
}

function yasHesapla(dogumTarihi: string | null): number {
  if (!dogumTarihi) return -1;
  const dogum = new Date(dogumTarihi);
  const bugun = new Date();
  let yas = bugun.getFullYear() - dogum.getFullYear();
  const a = bugun.getMonth() - dogum.getMonth();
  if (a < 0 || (a === 0 && bugun.getDate() < dogum.getDate())) yas--;
  return yas;
}

function tarihFormatla(tarih: string | null) {
  if (!tarih) return "-";
  return new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function isTakipBekleyen(h: Patient): boolean {
  const now = Date.now();
  const createdAt = new Date(h.created_at).getTime();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  if (!h.son_randevu_tarihi) return createdAt < thirtyDaysAgo;
  return new Date(h.son_randevu_tarihi).getTime() < ninetyDaysAgo;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark> : part
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({
  value, onChange, readonly = false, size = 14,
}: { value: number | null; onChange?: (v: number) => void; readonly?: boolean; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(star)}
          className={clsx("transition", readonly ? "cursor-default" : "cursor-pointer hover:scale-110")}
        >
          <Star
            size={size}
            className={clsx(
              (hovered || value || 0) >= star ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Yeni Hasta Modal — Yardımcı Bileşenler ──────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return (parts[0][0] ?? "").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAY_HEADERS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

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
          {/* Ay/Yıl navigasyon */}
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
                    onBlur={() => {
                      const y = parseInt(calYearInp, 10);
                      if (y >= 1900 && y <= 2100) setCalYear(y);
                      setCalYearEdit(false);
                    }}
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

          {/* Gün başlıkları */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Gün ızgarası */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array(firstDayOffset(calYear, calMonth)).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth(calYear, calMonth)).fill(null).map((_, i) => {
              const day = i + 1;
              const isSel = isCurView && selDay === day;
              const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
              return (
                <button key={day} type="button" onClick={() => selectDay(day)}
                  className={clsx(
                    "text-xs py-1.5 rounded-lg transition font-medium text-center",
                    isSel ? "bg-blue-600 text-white shadow-sm" :
                    isToday ? "bg-blue-50 text-blue-700 font-bold" :
                    "hover:bg-slate-100 text-slate-700"
                  )}>
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
    const groups = [
      ...COUNTRY_GROUPS.map(g => ({
        label: g.label,
        countries: g.countries.filter(c => c.name.toLocaleLowerCase("tr-TR").includes(q)),
      })),
      ...(customCountries.some(n => n.toLocaleLowerCase("tr-TR").includes(q))
        ? [{ label: "Özel Ülkeler", countries: customCountries.filter(n => n.toLocaleLowerCase("tr-TR").includes(q)).map(n => ({ flag: "🌍", name: n })) }]
        : []),
    ].filter(g => g.countries.length > 0);
    return groups;
  }, [search, customCountries]);

  const selected = findCountry(value);

  function savePinned(next: string[]) {
    setPinned(next);
    localStorage.setItem("ulke_sabitler", JSON.stringify(next));
  }

  function togglePin(name: string) {
    savePinned(pinned.includes(name) ? pinned.filter(p => p !== name) : [...pinned, name]);
  }

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

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }
  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...pinned];
    const [item] = next.splice(dragIdx, 1);
    next.splice(idx, 0, item);
    savePinned(next);
    setDragIdx(null); setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  const displayGroups = filteredGroups ?? COUNTRY_GROUPS;

  return (
    <div ref={cRef} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={clsx("w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white transition text-left", open ? "ring-2 ring-blue-400 border-blue-300" : "border-slate-200 hover:border-slate-300")}>
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
            {/* Sabitlenmiş — sadece arama yokken göster */}
            {!search && pinned.length > 0 && (
              <div>
                {pinned.map((name, idx) => {
                  const c = findCountry(name);
                  if (!c) return null;
                  const isDragging = dragIdx === idx;
                  const isOver = dragOverIdx === idx && dragIdx !== idx;
                  return (
                    <div key={name}
                      draggable
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDrop={e => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2 group/item transition select-none",
                        value === name ? "bg-blue-50" : "hover:bg-blue-50",
                        isDragging && "opacity-40",
                        isOver && "border-t-2 border-blue-400",
                      )}>
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

            {/* Gruplar */}
            {displayGroups.map(group => {
              const countries = group.countries.filter(c => search ? true : !pinned.includes(c.name));
              if (countries.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider sticky top-0">
                    {group.label}
                  </div>
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

            {/* Özel ülkeler — arama yokken ayrı bölüm */}
            {!search && customCountries.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">
                  Özel Ülkeler
                </div>
                {customCountries.filter(n => !pinned.includes(n)).map(name => (
                  <div key={name} className={clsx("flex items-center gap-2 px-3 py-2 group/item hover:bg-blue-50 transition", value === name && "bg-blue-50")}>
                    <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left"
                      onMouseDown={e => { e.preventDefault(); onChange(name); setOpen(false); }}>
                      <span className="text-base leading-none">🌍</span>
                      <span className={clsx(value === name ? "font-semibold text-blue-700" : "text-slate-700")}>{name}</span>
                      {value === name && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); togglePin(name); }}
                      title={pinned.includes(name) ? "Sabitlemeyi Kaldır" : "Sabitle"}
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

            {search && filteredGroups?.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-sm">Bulunamadı</div>
            )}
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
    setOptions(next);
    setSelected([...selected, v]);
    setAddInp("");
  }

  function confirmEdit() {
    if (!editingItem) return;
    const nv = editVal.trim();
    if (!nv || nv === editingItem || options.includes(nv)) { setEditingItem(null); return; }
    const next = options.map(o => o === editingItem ? nv : o);
    setOptions(next);
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
          className={clsx("flex flex-wrap items-center min-h-[40px] w-full border rounded-lg px-2.5 py-1.5 gap-1.5 bg-white cursor-pointer transition", open ? "ring-2 ring-blue-400 border-blue-300" : "border-slate-200")}>
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
          className={clsx("ml-auto text-xs font-semibold px-2 py-0.5 rounded-lg transition", editMode ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600")}>
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
                editMode && "pr-5 cursor-default"
              )}>
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

// ─── Yeni Hasta Modal ─────────────────────────────────────────────────────────

function YeniHastaModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
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
  const formRef = useRef<HTMLFormElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFormData({ ad_soyad: "", telefon: "", tc_kimlik: "", cinsiyet: "Seçiniz", dogum_tarihi: "", ulke: "Türkiye", meslek: "", notlar: "", referans: null });
    setSelectedIslemler([]); setSeciliEtiketler([]);
    setFotoFile(null); setFotoPreview(null); setHata("");
  }
  function handleClose() { resetForm(); onClose(); }

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
    resetForm(); onSaved();
  }

  if (!open) return null;
  const initials = getInitials(formData.ad_soyad);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
          <div><h2 className="text-lg font-bold text-slate-800">Yeni Hasta Kaydı</h2>
            <p className="text-xs text-slate-500">Hasta kartı oluşturun ve etiketleyin.</p></div>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"><X size={18} /></button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Kimlik Bilgileri */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3"><User size={13} /> Kimlik Bilgileri</h3>
            <div className="space-y-3">
              {/* Profil Fotoğrafı + Etiketler yan yana */}
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0 group">
                  <div onClick={() => fotoInputRef.current?.click()}
                    className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition relative">
                    {fotoPreview
                      ? <img src={fotoPreview} alt="Profil" className="w-full h-full object-cover" />
                      : initials
                        ? <span className="text-xl font-bold text-blue-500 tracking-tight select-none">{initials}</span>
                        : <User size={24} className="text-blue-300" />
                    }
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full">
                      <Camera size={13} className="text-white" />
                    </div>
                  </div>
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  {fotoPreview ? (
                    <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); if (fotoInputRef.current) fotoInputRef.current.value = ""; }}
                      title="Fotoğrafı Kaldır"
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow border border-white">
                      <X size={10} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => fotoInputRef.current?.click()}
                      title="Fotoğraf Ekle"
                      className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 transition shadow-sm border-2 border-white">
                      <Camera size={10} />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <EtiketEditor
                    selected={seciliEtiketler} setSelected={setSeciliEtiketler}
                    allTags={etiketListesi} setAllTags={v => { setEtiketListesi(v); localStorage.setItem("hasta_etiket_listesi", JSON.stringify(v)); }}
                  />
                </div>
              </div>
              {/* Ad Soyad — tam genişlik */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad <span className="text-red-500">*</span></label>
                <input required value={formData.ad_soyad} onChange={e => setFormData(p => ({ ...p, ad_soyad: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                <PhoneInput value={formData.telefon} onChange={val => setFormData(p => ({ ...p, telefon: val }))} disabled={loading} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">TC Kimlik / Pasaport No</label>
                  <input value={formData.tc_kimlik} onChange={e => setFormData(p => ({ ...p, tc_kimlik: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="TCKN veya Pasaport" />
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
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Meslek</label>
                <input value={formData.meslek} onChange={e => setFormData(p => ({ ...p, meslek: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Meslek (isteğe bağlı)" />
              </div>
            </div>
          </div>

          {/* Nasıl Ulaştı? */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Kliniği Nasıl Öğrendi?
            </h3>
            <ReferansSecici
              value={formData.referans}
              onChange={v => setFormData(p => ({ ...p, referans: v }))}
              disabled={loading}
            />
          </div>

          {/* Klinik Detaylar */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"><Stethoscope size={13} /> Klinik Detaylar</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">İlgilendiği İşlem(ler)</label>
                <IslemMultiSelect
                  selected={selectedIslemler} setSelected={setSelectedIslemler}
                  options={islemListesi} setOptions={v => { setIslemListesi(v); localStorage.setItem("hasta_islem_listesi", JSON.stringify(v)); }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notlar</label>
                <textarea value={formData.notlar} onChange={e => setFormData(p => ({ ...p, notlar: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Kısa notlar..." maxLength={300} />
              </div>
            </div>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p>}
        </form>
        <div className="px-6 py-4 border-t bg-slate-50 flex gap-2 shrink-0">
          <button type="button" onClick={handleClose} disabled={loading}
            className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition">İptal</button>
          <button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm">
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tablo Satırı ─────────────────────────────────────────────────────────────

type HastaSatiriProps = {
  patient: Patient;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  onRowClick: (patient: Patient) => void;
  onMoreClick: (e: React.MouseEvent, patient: Patient) => void;
  onRandevuClick: (e: React.MouseEvent, patient: Patient) => void;
  onWhatsAppClick: (e: React.MouseEvent, patient: Patient) => void;
  onDetailClick: (e: React.MouseEvent, patient: Patient) => void;
  aramaMetni: string;
};

const HastaSatiri = memo(function HastaSatiri({
  patient, visibleColumns, columnOrder, onRowClick, onMoreClick, onRandevuClick, onWhatsAppClick, onDetailClick, aramaMetni,
}: HastaSatiriProps) {
  const yas = yasHesapla(patient.dogum_tarihi);
  const bekleyen = isTakipBekleyen(patient);

  function renderCell(col: string) {
    if (!visibleColumns[col]) return null;
    switch (col) {
      case "yas":
        return <td key="yas" className="px-5 py-3 text-sm text-slate-600 overflow-hidden">{yas === -1 ? "-" : yas}</td>;
      case "cinsiyet":
        return <td key="cinsiyet" className="px-5 py-3 text-sm text-slate-600 overflow-hidden"><span className="block truncate">{patient.cinsiyet || "-"}</span></td>;
      case "telefon":
        return (
          <td key="telefon" className="px-5 py-3 overflow-hidden">
            <span className="block truncate text-sm text-slate-600">
              {highlightText(formatPhoneDisplay(patient.telefon), aramaMetni)}
            </span>
          </td>
        );
      case "ulke":
        return <td key="ulke" className="px-5 py-3 overflow-hidden"><span className="block truncate text-sm text-slate-600">{patient.ulke || "Türkiye"}</span></td>;
      case "sonIslem":
        return (
          <td key="sonIslem" className="px-5 py-3 overflow-hidden">
            <span className="block truncate text-sm text-slate-600">{patient.islem || "-"}</span>
            {patient.son_randevu_tarihi && (
              <div className="truncate text-xs text-slate-400">{tarihFormatla(patient.son_randevu_tarihi)}</div>
            )}
          </td>
        );
      case "etiketler":
        return (
          <td key="etiketler" className="px-5 py-3 overflow-hidden">
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {patient.etiketler && patient.etiketler.length > 0
                ? patient.etiketler.map((tag, i) => (
                  <span key={i} className={clsx("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border shrink-0",
                    TAG_STYLES[tag] || "bg-gray-100 text-gray-600 border-gray-200")}>
                    {highlightText(tag, aramaMetni)}
                  </span>
                ))
                : <span className="text-slate-300 text-xs">-</span>}
            </div>
          </td>
        );
      case "memnuniyet":
        return (
          <td key="memnuniyet" className="px-5 py-3 overflow-hidden">
            {patient.doktor_puani != null
              ? <StarRating value={patient.doktor_puani} readonly size={12} />
              : <span className="text-xs text-slate-300">-</span>}
          </td>
        );
      case "islem":
        return (
          <td key="islem" className="px-5 py-3">
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip label="WhatsApp ile mesaj gönder">
                <button
                  onClick={(e) => { e.stopPropagation(); onWhatsAppClick(e, patient); }}
                  className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                ><MessageCircle size={15} /></button>
              </Tooltip>
              <Tooltip label="Hızlı randevu oluştur">
                <button
                  onClick={(e) => { e.stopPropagation(); onRandevuClick(e, patient); }}
                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                ><CalendarPlus size={15} /></button>
              </Tooltip>
              <Tooltip label="Diğer işlemler">
                <button
                  onClick={(e) => { e.stopPropagation(); onMoreClick(e, patient); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition"
                ><MoreHorizontal size={16} /></button>
              </Tooltip>
            </div>
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <tr className={clsx("hover:bg-blue-50/40 transition-colors group cursor-pointer", bekleyen && "bg-amber-50/30")}
      onClick={() => onRowClick(patient)}>
      <td className="px-3 py-3 overflow-hidden">
        <div className="flex items-center gap-2">
          {/* Hasta dosyası ikonu — her zaman görünür, en sol */}
          <Tooltip label="Detaylı hasta dosyasını aç" side="right">
            <button
              onClick={(e) => { e.stopPropagation(); onDetailClick(e, patient); }}
              className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition"
            >
              <FolderOpen size={16} />
            </button>
          </Tooltip>
          {bekleyen && <span title="Takip bekliyor" className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 break-words">{highlightText(patient.ad_soyad, aramaMetni)}</div>
            <div className="text-xs text-slate-400 truncate md:hidden">{formatPhoneDisplay(patient.telefon)}</div>
          </div>
        </div>
      </td>
      {columnOrder.map((col) => renderCell(col))}
    </tr>
  );
});

// ─── Tab tipi ────────────────────────────────────────────────────────────────

type TabFilter = "tum" | "bugun" | "hafta" | "takip";

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function HastaListesiPage() {
  const router = useRouter();
  const [hastalar, setHastalar] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [aramaMetni, setAramaMetni] = useState("");
  const [siralama, setSiralama] = useState<{ key: keyof Patient; yon: "asc" | "desc" }>({ key: "created_at", yon: "desc" });
  const [tab, setTab] = useState<TabFilter>("tum");

  // ─── Kalıcı ayarlar (localStorage) ───────────────────────────────────────

  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS);
  const [filterVisible, setFilterVisible] = useState(DEFAULT_FILTER_VISIBLE);
  const [statsVisible, setStatsVisible] = useState(DEFAULT_STATS_VISIBLE);

  // Sayfa mount olunca localStorage'dan yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.visibleColumns) setVisibleColumns(s.visibleColumns);
      if (s.columnOrder) setColumnOrder(s.columnOrder);
      if (s.colWidths) setColWidths(s.colWidths);
      if (s.filterVisible) setFilterVisible(s.filterVisible);
      if (s.statsVisible) setStatsVisible(s.statsVisible);
    } catch { /* ignore */ }
  }, []);

  // Ayarlar değişince localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ visibleColumns, columnOrder, colWidths, filterVisible, statsVisible }));
    } catch { /* ignore */ }
  }, [visibleColumns, columnOrder, colWidths, filterVisible, statsVisible]);

  function resetToDefaults() {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    setColWidths({ ...DEFAULT_COL_WIDTHS });
    setFilterVisible(DEFAULT_FILTER_VISIBLE);
    setStatsVisible(DEFAULT_STATS_VISIBLE);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }

  // ─── Sütun yeniden boyutlandırma ─────────────────────────────────────────

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);
  const [colDragItem, setColDragItem] = useState<string | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      setColWidths((prev) => ({ ...prev, [col]: Math.max(50, startWidth + e.clientX - startX) }));
    }
    function onMouseUp() {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ─── Popover durumları ────────────────────────────────────────────────────

  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [showStatsPopover, setShowStatsPopover] = useState(false);

  // Tarih filtresi
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filtreler
  const [filterCinsiyet, setFilterCinsiyet] = useState("");
  const [filterUlke, setFilterUlke] = useState("");
  const [filterEtiketler, setFilterEtiketler] = useState<string[]>([]);
  const [filterMinPuan, setFilterMinPuan] = useState(0);

  // Modal durumları
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editModalPatient, setEditModalPatient] = useState<Patient | null>(null);
  const [editModalForm, setEditModalForm] = useState<Patient | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [showYeniHastaModal, setShowYeniHastaModal] = useState(false);
  const [randevuPatient, setRandevuPatient] = useState<Patient | null>(null);

  // Action menü
  const [actionMenu, setActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  async function fetchHastalar(tabKey: TabFilter = "tum") {
    setLoading(true);
    let query = supabase.from("hastalar").select("*");
    if (tabKey === "bugun") {
      const { gte, lt } = getTodayRange();
      query = query.gte("created_at", gte).lt("created_at", lt);
    } else if (tabKey === "hafta") {
      const { gte, lt } = getThisWeekRange();
      query = query.gte("created_at", gte).lt("created_at", lt);
    }
    const { data, error } = await query;
    if (!error && data) setHastalar(data as Patient[]);
    setLoading(false);
  }

  useEffect(() => { fetchHastalar(tab); }, [tab]);

  // ─── Filtreleme & Sıralama ────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    let data = [...hastalar];
    if (tab === "takip") data = data.filter(isTakipBekleyen);
    if (aramaMetni) {
      const lower = aramaMetni.toLowerCase();
      data = data.filter((h) =>
        (h.ad_soyad?.toLowerCase() || "").includes(lower) ||
        (h.telefon || "").includes(lower) ||
        (h.etiketler || []).join(" ").toLowerCase().includes(lower)
      );
    }
    if (filterCinsiyet) data = data.filter((h) => h.cinsiyet === filterCinsiyet);
    if (filterUlke) data = data.filter((h) => (h.ulke || "Türkiye") === filterUlke);
    if (filterEtiketler.length > 0)
      data = data.filter((h) => filterEtiketler.every((e) => (h.etiketler || []).includes(e)));
    if (filterMinPuan > 0)
      data = data.filter((h) => (h.doktor_puani ?? 0) >= filterMinPuan);
    if (dateFrom || dateTo) {
      data = data.filter((h) => {
        const d = new Date(h.created_at);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      });
    }
    data.sort((a, b) => {
      const valA = a[siralama.key] ?? "";
      const valB = b[siralama.key] ?? "";
      if (siralama.key === "created_at" || siralama.key === "son_randevu_tarihi") {
        return siralama.yon === "asc"
          ? new Date(valA as string).getTime() - new Date(valB as string).getTime()
          : new Date(valB as string).getTime() - new Date(valA as string).getTime();
      }
      if (valA < valB) return siralama.yon === "asc" ? -1 : 1;
      if (valA > valB) return siralama.yon === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [hastalar, aramaMetni, siralama, filterCinsiyet, filterUlke, filterEtiketler, filterMinPuan, dateFrom, dateTo, tab]);

  // ─── Mini İstatistikler ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      toplam: hastalar.length,
      buAy: hastalar.filter((h) => new Date(h.created_at) >= thisMonthStart).length,
      vip: hastalar.filter((h) => (h.etiketler || []).includes("VIP")).length,
      takipBekleyen: hastalar.filter(isTakipBekleyen).length,
    };
  }, [hastalar]);

  const STATS_CONFIG = [
    { key: "toplam", label: "Toplam Hasta", icon: Users, color: "text-blue-600 bg-blue-50", border: "border-blue-100", value: stats.toplam, onClick: undefined as (() => void) | undefined },
    { key: "buAy", label: "Bu Ay Yeni", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50", border: "border-emerald-100", value: stats.buAy, onClick: undefined },
    { key: "vip", label: "VIP Hasta", icon: Star, color: "text-amber-600 bg-amber-50", border: "border-amber-100", value: stats.vip, onClick: undefined },
    { key: "takip", label: "Takip Bekliyor", icon: AlertCircle, color: "text-orange-600 bg-orange-50", border: "border-orange-100", value: stats.takipBekleyen, onClick: () => setTab("takip") },
  ];

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openActionMenu = useCallback((e: React.MouseEvent, patient: Patient) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenu({ id: patient.id, top: rect.bottom + 4, left: rect.left + window.scrollX - 160 });
  }, []);

  const handleDeleteHasta = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("hastalar").delete().eq("id", id);
    if (!error) setHastalar((prev) => prev.filter((h) => h.id !== id));
    setLoading(false);
    setDeleteModalId(null);
    setActionMenu(null);
  };

  const handleEditModalOpen = (hasta: Patient) => {
    setEditModalPatient(hasta);
    setEditModalForm({ ...hasta });
  };

  const handleEditFormChange = (field: keyof Patient, value: unknown) => {
    setEditModalForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleToggleEtiket = (etiket: string) => {
    setEditModalForm((prev) => {
      if (!prev) return prev;
      const prevTags: string[] = prev.etiketler || [];
      const nextTags = prevTags.includes(etiket) ? prevTags.filter((e) => e !== etiket) : [...prevTags, etiket];
      return { ...prev, etiketler: nextTags };
    });
  };

  const handleEditSave = async () => {
    if (!editModalForm || !editModalForm.id) return;
    setLoading(true);
    const { id, ...fields } = editModalForm;
    const { error, data } = await supabase.from("hastalar").update({ ...fields }).eq("id", id).select();
    if (!error && data && data[0]) {
      setHastalar((prev) => prev.map((h) => (h.id === id ? data[0] as Patient : h)));
      setEditModalPatient(null);
      setEditModalForm(null);
    }
    setLoading(false);
  };

  const activeFilterCount =
    (filterCinsiyet ? 1 : 0) + (filterUlke ? 1 : 0) + filterEtiketler.length + (filterMinPuan > 0 ? 1 : 0);

  // ─── Sütun sürükle-bırak (pointer events — akıcı anlık sıralama) ─────────────

  useEffect(() => {
    if (!colDragItem) return;
    function onPointerUp() {
      setColDragItem(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [colDragItem]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen relative">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hasta Listesi</h1>
          <p className="text-slate-500 text-sm">{filteredData.length} kayıt listeleniyor.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <Download size={16} /><span className="hidden sm:inline">Dışa Aktar</span>
          </button>
          <button onClick={() => setShowYeniHastaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
            <Plus size={18} /> Yeni Hasta
          </button>
        </div>
      </div>

      {/* MİNİ İSTATİSTİKLER */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Göstergeler</span>
          <div className="relative">
            <button
              onClick={() => setShowStatsPopover((v) => !v)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
              title="Göstergeleri düzenle"
            >
              <Settings2 size={14} />
            </button>
            {showStatsPopover && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowStatsPopover(false)} />
                <div className="absolute right-0 top-7 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-40">
                  <div className="text-xs font-semibold text-slate-400 px-2 mb-1">GÖSTERGELERİ DÜZENLE</div>
                  <p className="text-[10px] text-slate-400 px-2 mb-2">Hangi kartların görüneceğini seçin</p>
                  {STATS_CONFIG.map((s) => (
                    <label key={s.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statsVisible[s.key as keyof typeof statsVisible]}
                        onChange={() => setStatsVisible((prev) => ({ ...prev, [s.key]: !prev[s.key as keyof typeof statsVisible] }))}
                      />
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={() => { resetToDefaults(); setShowStatsPopover(false); }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 w-full hover:bg-blue-50 rounded transition"
                    >
                      <RotateCcw size={11} /> Varsayılan Ayarlara Dön
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS_CONFIG.filter((s) => statsVisible[s.key as keyof typeof statsVisible]).map((s) => (
            <button
              key={s.key}
              onClick={s.onClick}
              className={clsx("bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm transition", s.border,
                s.onClick ? "hover:shadow-md cursor-pointer" : "cursor-default")}
            >
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", s.color)}>
                <s.icon size={20} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SEKME BAR */}
      <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center mb-4 gap-1 shadow-sm relative z-10">
        {[
          { key: "tum", label: "Tümü", icon: Users },
          { key: "bugun", label: "Bugün Eklenenler", icon: Calendar },
          { key: "hafta", label: "Bu Hafta", icon: Calendar },
          { key: "takip", label: `Takip Bekleyen (${stats.takipBekleyen})`, icon: AlertCircle },
        ].map((tabOpt) => (
          <button key={tabOpt.key} onClick={() => setTab(tabOpt.key as TabFilter)}
            className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition",
              tab === tabOpt.key ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-blue-700 hover:bg-white/80")}>
            <tabOpt.icon size={16} />
            {tabOpt.label}
          </button>
        ))}
        <div className="flex-1" />

        {/* Tarih Seç */}
        <div className="relative">
          <button
            className={clsx("flex items-center rounded-lg gap-2 px-3 py-2 text-sm font-medium transition",
              (dateFrom || dateTo) ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-700 hover:bg-white/90")}
            onClick={() => {
              if (!showDatePopover && !dateFrom && !dateTo) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                setDateFrom(fmtDate(yesterday));
                setDateTo(fmtDate(today));
              }
              setShowDatePopover((v) => !v);
            }}>
            <Calendar size={16} />
            <span className="font-semibold">{(dateFrom || dateTo) ? "Tarih Seçildi" : "Tarih Seç"}</span>
          </button>
          {showDatePopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowDatePopover(false)} />
              <div className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-40">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Kayıt tarihi aralığı</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Başlangıç</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bitiş</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setDateFrom(""); setDateTo(""); setShowDatePopover(false); }}
                    className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">Temizle</button>
                  <button onClick={() => setShowDatePopover(false)}
                    className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Uygula</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative">
        {/* TOOLBAR */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Ad soyad, telefon veya etiket ara..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 relative">

            {/* Sort */}
            <Tooltip label="Sıralama">
            <button onClick={() => setShowSortPopover((s) => !s)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition">
              <ArrowUpDown size={18} />
            </button>
            </Tooltip>
            {showSortPopover && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSortPopover(false)} />
                <div className="absolute right-20 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-40">
                  <div className="text-xs font-semibold text-slate-400 px-3 py-2">SIRALAMA</div>
                  {[
                    { label: "En Yeniler", key: "created_at", yon: "desc" },
                    { label: "En Eskiler", key: "created_at", yon: "asc" },
                    { label: "İsim (A-Z)", key: "ad_soyad", yon: "asc" },
                    { label: "İsim (Z-A)", key: "ad_soyad", yon: "desc" },
                    { label: "Puan (yüksek)", key: "doktor_puani", yon: "desc" },
                  ].map((opt) => (
                    <button key={opt.label} onClick={() => { setSiralama({ key: opt.key as keyof Patient, yon: opt.yon as "asc" | "desc" }); setShowSortPopover(false); }}
                      className={clsx("w-full text-left px-3 py-2 text-sm rounded-lg transition",
                        siralama.key === opt.key && siralama.yon === opt.yon ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50")}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Filter */}
            <Tooltip label="Filtrele">
            <button onClick={() => setShowFilterPopover((f) => !f)}
              className={clsx("p-2 border rounded-lg transition relative",
                activeFilterCount > 0 ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600")}>
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            </Tooltip>
            {showFilterPopover && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFilterPopover(false)} />
                <div className="absolute right-10 top-12 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-40">
                  {/* Filter header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm">Filtrele</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {filteredData.length} hasta
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setFilterCinsiyet(""); setFilterUlke(""); setFilterEtiketler([]); setFilterMinPuan(0); }}
                          className="text-xs text-red-500 hover:text-red-700 transition px-1.5 py-0.5 rounded hover:bg-red-50">Temizle</button>
                      )}
                      <div className="relative">
                        <button onClick={() => setShowFilterSettings((v) => !v)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition">
                          <Settings2 size={14} />
                        </button>
                        {showFilterSettings && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowFilterSettings(false)} />
                            <div className="absolute right-0 top-7 w-44 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 mb-1">Filtre Kategorileri</p>
                              {(Object.keys(filterVisible) as (keyof typeof filterVisible)[]).map((key) => (
                                <label key={key} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input type="checkbox" checked={filterVisible[key]}
                                    onChange={() => setFilterVisible((prev) => ({ ...prev, [key]: !prev[key] }))} />
                                  <span className="text-xs text-slate-700 capitalize">
                                    {{ cinsiyet: "Cinsiyet", ulke: "Ülke", etiket: "Etiket", doktorPuani: "Doktor Puanı" }[key]}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {filterVisible.cinsiyet && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cinsiyet</p>
                      <div className="flex gap-2">
                        {["", "Kadın", "Erkek"].map((c) => (
                          <button key={c} onClick={() => setFilterCinsiyet(c === filterCinsiyet ? "" : c)}
                            className={clsx("px-3 py-1 rounded-full text-xs font-medium border transition",
                              filterCinsiyet === c && c !== "" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400")}>
                            {c || "Tümü"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filterVisible.ulke && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ülke</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["", ...ULKE_LIST].map((u) => (
                          <button key={u || "tum"} onClick={() => setFilterUlke(u === filterUlke ? "" : u)}
                            className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border transition",
                              filterUlke === u && u !== "" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300")}>
                            {u || "Tümü"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filterVisible.etiket && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Etiket</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TAG_LIST.map((tag) => (
                          <button key={tag}
                            onClick={() => setFilterEtiketler((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                            className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border transition",
                              filterEtiketler.includes(tag) ? (TAG_STYLES[tag] ?? "bg-blue-100 text-blue-700 border-blue-200") : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300")}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filterVisible.doktorPuani && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min. Doktor Puanı</p>
                      <div className="flex gap-1.5 items-center">
                        <button onClick={() => setFilterMinPuan(0)}
                          className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border transition",
                            filterMinPuan === 0 ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300")}>
                          Tümü
                        </button>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <button key={p} onClick={() => setFilterMinPuan(p === filterMinPuan ? 0 : p)}
                            className="transition">
                            <Star size={18} className={filterMinPuan >= p ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 mt-3 pt-2">
                    <button
                      onClick={() => { resetToDefaults(); setShowFilterPopover(false); }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-1 py-1 w-full hover:bg-blue-50 rounded transition"
                    >
                      <RotateCcw size={11} /> Varsayılan Ayarlara Dön
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Columns */}
            <Tooltip label="Sütunları düzenle">
            <button onClick={() => setShowColumnPopover((c) => !c)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition">
              <Columns size={18} />
            </button>
            </Tooltip>
            {showColumnPopover && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColumnPopover(false)} />
                <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-40">
                  <div className="text-xs font-semibold text-slate-400 px-2 mb-1">SÜTUNLAR</div>
                  <p className="text-[10px] text-slate-400 px-2 mb-2">Görünürlük için tık · Sıra için sürükle</p>
                  {columnOrder.map((col) => (
                    <div
                      key={col}
                      style={{ touchAction: "none" }}
                      onPointerDown={() => {
                        setColDragItem(col);
                        document.body.style.cursor = "grabbing";
                        document.body.style.userSelect = "none";
                      }}
                      onPointerEnter={() => {
                        if (!colDragItem || colDragItem === col) return;
                        setColumnOrder((prev) => {
                          const arr = [...prev];
                          const fi = arr.indexOf(colDragItem);
                          const ti = arr.indexOf(col);
                          arr.splice(fi, 1);
                          arr.splice(ti, 0, colDragItem);
                          return arr;
                        });
                      }}
                      className={clsx(
                        "flex items-center gap-2 px-2 py-1.5 rounded select-none transition-all duration-100",
                        colDragItem === col
                          ? "bg-blue-50 shadow-sm ring-1 ring-blue-200 scale-[1.02] cursor-grabbing"
                          : "hover:bg-slate-50 cursor-grab"
                      )}
                    >
                      <GripVertical size={12} className="text-slate-300 shrink-0" />
                      <input
                        type="checkbox"
                        checked={visibleColumns[col as keyof typeof visibleColumns]}
                        onChange={() => setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm flex-1">{COL_LABELS[col] || col}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={() => { resetToDefaults(); setShowColumnPopover(false); }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 w-full hover:bg-blue-50 rounded transition"
                    >
                      <RotateCcw size={11} /> Varsayılan Ayarlara Dön
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* TABLO */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                {/* Ad Soyad — sabit sütun */}
                <th
                  className="px-5 py-3 relative group"
                  style={{ width: colWidths.adSoyad, minWidth: 80 }}
                >
                  AD SOYAD
                  <div
                    className="absolute right-0 top-2 bottom-2 w-px bg-slate-200 cursor-col-resize"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.body.style.cursor = "col-resize";
                      document.body.style.userSelect = "none";
                      resizingRef.current = { col: "adSoyad", startX: e.clientX, startWidth: colWidths.adSoyad };
                    }}
                  />
                </th>
                {columnOrder.map((col) => {
                  if (!visibleColumns[col as keyof typeof visibleColumns]) return null;
                  return (
                    <th
                      key={col}
                      className={clsx("px-5 py-3 relative group", col === "islem" && "text-right")}
                      style={{ width: colWidths[col], minWidth: 50 }}
                    >
                      {COL_HEADERS[col] || col.toUpperCase()}
                      <div
                        className="absolute right-0 top-2 bottom-2 w-px bg-slate-200 cursor-col-resize"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.body.style.cursor = "col-resize";
                          document.body.style.userSelect = "none";
                          resizingRef.current = { col, startX: e.clientX, startWidth: colWidths[col] ?? 100 };
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={columnOrder.length + 1} className="p-12 text-center text-slate-400">Yükleniyor...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={columnOrder.length + 1} className="p-12 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
              ) : (
                filteredData.map((patient) => (
                  <HastaSatiri
                    key={patient.id}
                    patient={patient}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    onRowClick={(p) => setSelectedPatient(p)}
                    onMoreClick={openActionMenu}
                    onRandevuClick={(e, p) => { e.stopPropagation(); setRandevuPatient(p); }}
                    onWhatsAppClick={(e, p) => {
                      e.stopPropagation();
                      if (p.telefon) window.open(`https://wa.me/${p.telefon.replace(/\D/g, "").replace(/^\+/, "")}`, "_blank");
                    }}
                    onDetailClick={(e, p) => { e.stopPropagation(); router.push(`/hastalar/hasta-listesi/${p.id}`); }}
                    aramaMetni={aramaMetni}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ACTION MENU ─── */}
      {actionMenu && (
        <>
          <div className="fixed inset-0 z-[9998] cursor-default" onClick={() => setActionMenu(null)} />
          <div className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] py-1 w-44 animate-in fade-in zoom-in-95"
            style={{ top: actionMenu.top, left: actionMenu.left }}>
            <button onClick={() => { router.push(`/hastalar/hasta-listesi/${actionMenu.id}`); setActionMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Eye size={14} /> Detaylı Dosya
            </button>
            <button onClick={() => { const h = hastalar.find((h) => h.id === actionMenu.id); if (h) handleEditModalOpen(h); setActionMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Pencil size={14} /> Düzenle
            </button>
            <button onClick={() => { const h = hastalar.find((h) => h.id === actionMenu.id); if (h) { setRandevuPatient(h); setActionMenu(null); } }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <CalendarPlus size={14} /> Randevu Al
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => { setDeleteModalId(actionMenu.id); setActionMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={14} /> Sil
            </button>
          </div>
        </>
      )}

      {/* ─── HIZLI BAKIŞ MODALI ─── */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedPatient(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white relative">
              <button onClick={() => setSelectedPatient(null)} className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition">
                <X size={16} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {selectedPatient.ad_soyad.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{selectedPatient.ad_soyad}</h2>
                  <p className="text-blue-200 text-xs">
                    {selectedPatient.cinsiyet || "Belirtilmemiş"} •{" "}
                    {yasHesapla(selectedPatient.dogum_tarihi) !== -1 ? `${yasHesapla(selectedPatient.dogum_tarihi)} yaş` : "Yaş bilinmiyor"}
                  </p>
                </div>
              </div>
              {selectedPatient.etiketler && selectedPatient.etiketler.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedPatient.etiketler.map((t) => (
                    <span key={t} className={clsx("text-[10px] border px-2 py-0.5 rounded-full font-medium", TAG_STYLES[t] || "bg-white/20 border-white/30 text-white")}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 space-y-2.5">
              {[
                { icon: Phone, label: "Telefon", value: selectedPatient.telefon || "-" },
                { icon: Stethoscope, label: "Son İşlem", value: selectedPatient.islem || "-" },
                { icon: Globe, label: "Ülke", value: selectedPatient.ulke || "Türkiye" },
                { icon: Calendar, label: "Kayıt", value: tarihFormatla(selectedPatient.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Icon size={13} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 leading-none">{label}</p>
                    <p className="text-sm font-medium text-slate-700">{value}</p>
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-2.5 mt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={13} className="text-blue-500" />
                    <span className="text-xs text-slate-600 font-medium">Doktor Değerlendirmesi</span>
                  </div>
                  <StarRating
                    value={selectedPatient.doktor_puani}
                    size={16}
                    onChange={async (v) => {
                      await supabase.from("hastalar").update({ doktor_puani: v }).eq("id", selectedPatient.id);
                      setHastalar((prev) => prev.map((h) => h.id === selectedPatient.id ? { ...h, doktor_puani: v } : h));
                      setSelectedPatient((prev) => prev ? { ...prev, doktor_puani: v } : prev);
                    }}
                  />
                </div>
                {selectedPatient.hasta_puani != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star size={13} className="text-amber-500" />
                      <span className="text-xs text-slate-600 font-medium">Hasta Puanı</span>
                    </div>
                    <StarRating value={selectedPatient.hasta_puani} readonly size={16} />
                  </div>
                )}
                {isTakipBekleyen(selectedPatient) && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-700">Bu hasta takip bekliyor</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2">
              {selectedPatient.telefon && (
                <button
                  onClick={() => window.open(`https://wa.me/${selectedPatient.telefon.replace(/\D/g, "").replace(/^\+/, "")}`, "_blank")}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition text-xs font-medium">
                  <MessageCircle size={16} /> WhatsApp
                </button>
              )}
              <button
                onClick={() => { setRandevuPatient(selectedPatient); setSelectedPatient(null); }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition text-xs font-medium">
                <CalendarPlus size={16} /> Randevu
              </button>
              <button
                onClick={() => router.push(`/hastalar/hasta-listesi/${selectedPatient.id}`)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition text-xs font-medium col-span-1">
                <Eye size={16} /> Detay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÜZENLE MODALI ─── */}
      {editModalPatient && editModalForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditModalPatient(null); setEditModalForm(null); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                  {editModalForm.ad_soyad?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{editModalForm.ad_soyad}</h2>
                  <p className="text-xs text-slate-500">Hasta bilgilerini düzenle</p>
                </div>
              </div>
              <button onClick={() => { setEditModalPatient(null); setEditModalForm(null); }} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <form onSubmit={async (e) => { e.preventDefault(); await handleEditSave(); }} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1 font-medium text-slate-500">Ad Soyad</label>
                  <input value={editModalForm.ad_soyad} onChange={(e) => handleEditFormChange("ad_soyad", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div><label className="block text-xs mb-1 font-medium text-slate-500">Telefon</label>
                  <PhoneInput value={editModalForm.telefon || ""} onChange={(val) => handleEditFormChange("telefon", val)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1 font-medium text-slate-500">Cinsiyet</label>
                    <select value={editModalForm.cinsiyet || ""} onChange={(e) => handleEditFormChange("cinsiyet", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                      <option value="">-</option><option value="Kadın">Kadın</option><option value="Erkek">Erkek</option>
                    </select></div>
                  <div><label className="block text-xs mb-1 font-medium text-slate-500">Doğum Tarihi</label>
                    <input type="date" value={editModalForm.dogum_tarihi || ""} onChange={(e) => handleEditFormChange("dogum_tarihi", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                </div>
                <div><label className="block text-xs mb-1 font-medium text-slate-500">Ülke</label>
                  <select value={editModalForm.ulke || "Türkiye"} onChange={(e) => handleEditFormChange("ulke", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    {ULKE_LIST.map((u) => <option key={u}>{u}</option>)}
                  </select></div>
                <div>
                  <label className="block text-xs mb-2 font-medium text-slate-500">Etiketler</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_LIST.map((tag) => (
                      <button key={tag} type="button"
                        className={clsx("px-2.5 py-1 rounded text-xs font-medium border transition",
                          (editModalForm.etiketler || []).includes(tag) ? TAG_STYLES[tag] + " ring-1 ring-blue-200" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-slate-100")}
                        onClick={() => handleToggleEtiket(tag)}>{tag}</button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs mb-2 font-medium text-slate-500 flex items-center gap-1">
                    <UserCheck size={12} /> Doktor Değerlendirmesi
                  </label>
                  <StarRating value={editModalForm.doktor_puani}
                    onChange={(v) => handleEditFormChange("doktor_puani", v)} size={20} />
                  <p className="text-[10px] text-slate-400 mt-1">Hasta puanınıza sadece siz müdahale edebilirsiniz. Hasta kendi puanını portal üzerinden verecektir.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setEditModalPatient(null); setEditModalForm(null); }}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm" disabled={loading}>Vazgeç</button>
                  <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm" disabled={loading}>
                    {loading ? <LoaderCircle size={14} className="animate-spin inline" /> : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── SİLME MODALI ─── */}
      {deleteModalId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[11000] flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteModalId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Hastayı Sil</h3>
                <p className="text-slate-500 text-sm">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModalId(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm" disabled={loading}>Vazgeç</button>
              <button onClick={() => handleDeleteHasta(deleteModalId)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold" disabled={loading}>
                {loading ? <LoaderCircle size={14} className="animate-spin inline" /> : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── YENİ HASTA MODALI ─── */}
      <YeniHastaModal
        open={showYeniHastaModal}
        onClose={() => setShowYeniHastaModal(false)}
        onSaved={() => { setShowYeniHastaModal(false); fetchHastalar(tab); }}
      />

      {/* ─── HIZLI RANDEVU MODALI ─── */}
      <YeniRandevuModal
        open={!!randevuPatient}
        onClose={() => setRandevuPatient(null)}
        defaultHastaId={randevuPatient?.id}
        defaultHastaAdi={randevuPatient?.ad_soyad}
        defaultHastaTelefon={randevuPatient?.telefon}
        onSaved={() => setRandevuPatient(null)}
      />
    </div>
  );
}
