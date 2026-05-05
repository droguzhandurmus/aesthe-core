"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  X,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

// --- Types ---
type HareketTipi = "Gelir" | "Gider";

type Finans = {
  id: string;
  tip: HareketTipi;
  kategori: string;
  aciklama: string;
  tutar: number;
  tarih: string;
  created_at: string;
};

type FinansForm = {
  tip: HareketTipi;
  kategori: string;
  aciklama: string;
  tutar: number;
  tarih: string;
};

// --- Kategori Seçenekleri (Örnek) ---
const GELIR_KATEGORILERI = [
  "Hizmet Bedeli",
  "Ürün Satışı",
  "Danışmanlık",
  "Diğer",
];
const GIDER_KATEGORILERI = [
  "Kira",
  "Personel",
  "Malzeme Alımı",
  "Vergi",
  "Diğer",
];

// --- Main Component ---
export default function FinansPage() {
  // State
  const [hareketler, setHareketler] = useState<Finans[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<null | HareketTipi>(null);
  const [form, setForm] = useState<FinansForm>({
    tip: "Gelir",
    kategori: "",
    aciklama: "",
    tutar: 0,
    tarih: new Date().toISOString().slice(0, 10),
  });
  const [kaydetLoading, setKaydetLoading] = useState(false);
  const [silLoading, setSilLoading] = useState<string | null>(null);

  // --- Data Fetch ---
  async function fetchFinans() {
    setLoading(true);
    const { data, error } = await supabase
      .from("finans")
      .select("*")
      .order("tarih", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) setHareketler(data as Finans[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchFinans();
  }, []);

  // --- KPI Hesapları ---
  const toplamGelir = useMemo(
    () =>
      hareketler
        .filter((h) => h.tip === "Gelir")
        .reduce((acc, h) => acc + (typeof h.tutar === "number" ? h.tutar : 0), 0),
    [hareketler]
  );
  const toplamGider = useMemo(
    () =>
      hareketler
        .filter((h) => h.tip === "Gider")
        .reduce((acc, h) => acc + (typeof h.tutar === "number" ? h.tutar : 0), 0),
    [hareketler]
  );
  const netKar = toplamGelir - toplamGider;

  // --- Gelir/Gider Ekle Modalı Kaydet ---
  async function handleFormSave(e: React.FormEvent) {
    e.preventDefault();
    setKaydetLoading(true);
    const insertObj = {
      ...form,
      tutar: Number(form.tutar),
    };
    const { error } = await supabase.from("finans").insert([insertObj]);
    setKaydetLoading(false);
    if (!error) {
      setModalOpen(null);
      setForm({
        tip: "Gelir",
        kategori: "",
        aciklama: "",
        tutar: 0,
        tarih: new Date().toISOString().slice(0, 10),
      });
      fetchFinans();
    }
  }

  // --- Silme ---
  async function handleDelete(id: string) {
    setSilLoading(id);
    const { error } = await supabase.from("finans").delete().eq("id", id);
    setSilLoading(null);
    if (!error) {
      fetchFinans();
    }
  }

  // --- Para Formatı ---
  function currency(val: number) {
    return val.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // --- Renkler ---
  const blueBG = "bg-blue-50";
  const blueBorder = "border-blue-100";

  // --- Render ---
  return (
    <div className="max-w-4xl mx-auto py-8 px-3 mb-16">
      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <KpiCard
          icon={<TrendingUp size={28} className="text-green-500" />}
          title="Toplam Gelir"
          value={currency(toplamGelir)}
          borderColor="border-green-100"
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <KpiCard
          icon={<TrendingDown size={28} className="text-rose-500" />}
          title="Toplam Gider"
          value={currency(toplamGider)}
          borderColor="border-rose-100"
          bgColor="bg-rose-50"
          textColor="text-rose-600"
        />
        <KpiCard
          icon={<Wallet size={28} className={netKar >= 0 ? "text-green-500" : "text-rose-500"} />}
          title="Net Kâr"
          value={currency(netKar)}
          borderColor={netKar >= 0 ? "border-green-200" : "border-rose-200"}
          bgColor={blueBG}
          textColor={netKar >= 0 ? "text-green-700" : "text-rose-700"}
        />
      </div>

      {/* --- Hızlı İşlem Butonları --- */}
      <div className="flex gap-4 mb-8">
        <button
          className="flex items-center gap-2 bg-green-500 hover:bg-green-700 transition text-white font-semibold px-5 py-2 rounded-lg shadow"
          onClick={() => {
            setForm({
              tip: "Gelir",
              kategori: "",
              aciklama: "",
              tutar: 0,
              tarih: new Date().toISOString().slice(0, 10),
            });
            setModalOpen("Gelir");
          }}
        >
          <Plus size={18} /> Gelir Ekle
        </button>
        <button
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-700 transition text-white font-semibold px-5 py-2 rounded-lg shadow"
          onClick={() => {
            setForm({
              tip: "Gider",
              kategori: "",
              aciklama: "",
              tutar: 0,
              tarih: new Date().toISOString().slice(0, 10),
            });
            setModalOpen("Gider");
          }}
        >
          <Minus size={18} /> Gider Ekle
        </button>
      </div>

      {/* --- Modal --- */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(null)}>
          <div className="w-[340px] sm:w-[360px] bg-white rounded-xl p-7 pb-5">
            <div className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-1">
              {modalOpen === "Gelir" ? (
                <TrendingUp size={20} className="text-green-500" />
              ) : (
                <TrendingDown size={20} className="text-rose-500" />
              )}
              {modalOpen === "Gelir" ? "Gelir Ekle" : "Gider Ekle"}
            </div>
            <form className="space-y-4 pt-2" onSubmit={handleFormSave}>
              {/* Tutar */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tutar</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.tutar}
                  onChange={(e) => setForm((f) => ({ ...f, tutar: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-blue-100 outline-blue-400"
                  placeholder="Tutar"
                />
              </div>
              {/* Kategori */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Kategori</label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg border border-blue-100 outline-blue-400"
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                >
                  <option value="">Seçiniz...</option>
                  {(modalOpen === "Gelir" ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).map((cat) => (
                    <option value={cat} key={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {/* Açıklama */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Açıklama</label>
                <input
                  value={form.aciklama}
                  onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-blue-100 outline-blue-400"
                  placeholder="Açıklama"
                  maxLength={80}
                />
              </div>
              {/* Tarih */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tarih</label>
                <input
                  type="date"
                  required
                  value={form.tarih}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-blue-100 outline-blue-400"
                />
              </div>
              <div className="flex justify-end pt-2 gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onClick={() => setModalOpen(null)}
                  disabled={kaydetLoading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={clsx(
                    "px-5 py-2 rounded-lg font-semibold shadow ml-2",
                    modalOpen === "Gelir"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-rose-600 text-white hover:bg-rose-700",
                    kaydetLoading && "opacity-70"
                  )}
                  disabled={kaydetLoading}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* --- Son Hareketler Listesi --- */}
      <div className={clsx("bg-white rounded-2xl shadow border", blueBorder)}>
        <div className="font-semibold text-blue-800 px-7 pt-6 pb-3 text-lg">
          Son Hareketler
        </div>
        <div className="overflow-x-auto pb-2">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr>
                <th className="w-1"></th>
                <th className="text-left py-2">Tarih</th>
                <th className="text-left py-2">Kategori</th>
                <th className="text-left py-2">Açıklama</th>
                <th className="text-right py-2 pr-4">Tutar</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : hareketler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                hareketler.map((h) => (
                  <tr key={h.id} className="group hover:bg-blue-50 transition">
                    <td>
                      <div
                        className={clsx(
                          "h-6 w-1 rounded-xl ml-1",
                          h.tip === "Gelir" ? "bg-green-500" : "bg-rose-500"
                        )}
                      />
                    </td>
                    <td className="py-2">
                      <span className="font-semibold">
                        {new Date(h.tarih).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="py-2">{h.kategori}</td>
                    <td className="py-2">{h.aciklama}</td>
                    <td
                      className={clsx(
                        "py-2 pr-4 font-bold text-right tabular-nums",
                        h.tip === "Gelir"
                          ? "text-green-700"
                          : "text-rose-600"
                      )}
                    >
                      {h.tip === "Gelir" ? "+" : "-"}{currency(Math.abs(h.tutar))}
                    </td>
                    <td>
                      <button
                        className="p-2 text-slate-400 hover:text-rose-600 transition"
                        onClick={() => handleDelete(h.id)}
                        disabled={silLoading === h.id}
                        title="Sil"
                      >
                        {silLoading === h.id ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- KPI Card ---
function KpiCard({
  icon,
  title,
  value,
  borderColor,
  bgColor,
  textColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  borderColor: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-4 p-4 md:p-5 rounded-xl border shadow-sm",
        borderColor,
        bgColor
      )}
    >
      <div className="p-3 bg-white rounded-full shadow-inner">{icon}</div>
      <div>
        <div className="text-slate-700 text-base font-medium">{title}</div>
        <div className={clsx("text-2xl md:text-3xl font-extrabold", textColor)}>
          {value}
        </div>
      </div>
    </div>
  );
}

// --- Modal ---
function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center bg-slate-900/50">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5"
          tabIndex={-1}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
