"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  X,
} from "lucide-react";
import clsx from "clsx";

// --- Types ---
type Kategori = "Toksin" | "Dolgu" | "İp" | "Medikal" | "Sarf";

type Stok = {
  id: string;
  urun_adi: string;
  kategori: Kategori;
  adet: number;
  kritik_seviye: number;
  birim_fiyat: number;
  son_kullanma_tarihi: string | null;
  notlar: string | null;
  created_at: string;
};

type StokForm = {
  urun_adi: string;
  kategori: Kategori;
  adet: number;
  kritik_seviye: number;
  birim_fiyat: number;
  son_kullanma_tarihi: string | null;
  notlar: string;
};

// --- Kategori Options ---
const KATEGORI_OPTIONS: Kategori[] = [
  "Toksin",
  "Dolgu",
  "İp",
  "Medikal",
  "Sarf",
];

// --- Helpers ---
function currencyFormat(val: number) {
  return val.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- Main Component ---
export default function StokTakibiPage() {
  // State (isim çakışmasını engelleyin)
  const [stokListesi, setStokListesi] = useState<Stok[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtre/Arama
  const [q, setQ] = useState<string>("");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | "">("");

  // Modal Durumu
  const [modalOpen, setModalOpen] = useState<null | "yeni" | { edit: Stok }>(null);

  // Form State
  const [form, setForm] = useState<StokForm>({
    urun_adi: "",
    kategori: "Toksin",
    adet: 0,
    kritik_seviye: 5,
    birim_fiyat: 0,
    son_kullanma_tarihi: "",
    notlar: "",
  });

  // Silme için
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- Data Fetch ---
  async function fetchStoklar() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("stoklar")
      .select("*")
      .order("urun_adi", { ascending: true });

    if (error) setError(error.message);
    else setStokListesi(data as Stok[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchStoklar();
  }, []);

  // Kritik stoklar
  const kritikStoklar = useMemo(
    () => stokListesi.filter((s: Stok) => s.adet <= s.kritik_seviye),
    [stokListesi]
  );

  // Toplam Stok Değeri
  const toplamStokDegeri = useMemo(
    () =>
      stokListesi.reduce(
        (sum: number, stok: Stok) =>
          sum +
          (typeof stok.birim_fiyat === "number" && typeof stok.adet === "number"
            ? stok.adet * stok.birim_fiyat
            : 0),
        0
      ),
    [stokListesi]
  );

  // Tablo verisi (filtreleme)
  const tableData = useMemo(() => {
    let data = [...stokListesi];
    if (kategoriFilter) data = data.filter((s) => s.kategori === kategoriFilter);
    if (q)
      data = data.filter((s) =>
        s.urun_adi?.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR"))
      );
    // Burada isterseniz sıralama da ekleyebilirsiniz:
    data.sort((a: Stok, b: Stok) => a.urun_adi.localeCompare(b.urun_adi, "tr-TR"));
    return data;
  }, [stokListesi, q, kategoriFilter]);

  // --- Modal Actions ---
  function openYeniUrun() {
    setForm({
      urun_adi: "",
      kategori: "Toksin",
      adet: 0,
      kritik_seviye: 5,
      birim_fiyat: 0,
      son_kullanma_tarihi: "",
      notlar: "",
    });
    setModalOpen("yeni");
  }

  function openEdit(stok: Stok) {
    setForm({
      urun_adi: stok.urun_adi,
      kategori: stok.kategori,
      adet: stok.adet,
      kritik_seviye: stok.kritik_seviye,
      birim_fiyat: stok.birim_fiyat,
      son_kullanma_tarihi: stok.son_kullanma_tarihi ?? "",
      notlar: stok.notlar ?? "",
    });
    setModalOpen({ edit: stok });
  }

  // --- Form Actions ---
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (modalOpen === "yeni") {
      // Insert
      const { error } = await supabase.from("stoklar").insert({
        urun_adi: form.urun_adi,
        kategori: form.kategori,
        adet: form.adet,
        kritik_seviye: form.kritik_seviye,
        birim_fiyat: form.birim_fiyat,
        son_kullanma_tarihi: form.son_kullanma_tarihi
          ? form.son_kullanma_tarihi
          : null,
        notlar: form.notlar ? form.notlar : null,
      });
      if (error) alert("Hata: " + error.message);
    } else if (modalOpen && "edit" in modalOpen) {
      // Update
      const { edit } = modalOpen;
      const { error } = await supabase
        .from("stoklar")
        .update({
          urun_adi: form.urun_adi,
          kategori: form.kategori,
          adet: form.adet,
          kritik_seviye: form.kritik_seviye,
          birim_fiyat: form.birim_fiyat,
          son_kullanma_tarihi: form.son_kullanma_tarihi
            ? form.son_kullanma_tarihi
            : null,
          notlar: form.notlar ? form.notlar : null,
        })
        .eq("id", edit.id);
      if (error) alert("Hata: " + error.message);
    }
    await fetchStoklar();
    setLoading(false);
    setModalOpen(null);
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    const { error } = await supabase.from("stoklar").delete().eq("id", id);
    if (error) alert("Hata: " + error.message);
    await fetchStoklar();
    setDeleteLoading(false);
    setDeleteId(null);
  }

  // --- Render ---
  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 flex items-center gap-3">
          <Package className="text-blue-500" size={28} />
          Klinik Envanter Takibi
        </h1>
        <button
          onClick={openYeniUrun}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-white font-semibold shadow focus:outline-none"
        >
          <Plus size={18} className="mr-1" />
          Yeni Ürün Ekle
        </button>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Toplam Ürün Çeşidi */}
        <KpiCard
          title="Toplam Ürün Çeşidi"
          value={stokListesi.length}
          icon={<Package size={28} className="text-blue-500" />}
          borderColor="border-blue-200"
          bgColor="bg-blue-50"
        />
        {/* Kritik Seviyedeki Ürünler */}
        <KpiCard
          title="Kritik Seviyedeki Ürünler"
          value={kritikStoklar.length}
          icon={<AlertTriangle size={28} className="text-rose-500" />}
          borderColor="border-rose-200"
          bgColor="bg-rose-50"
          highlight="rose"
        />
        {/* Toplam Stok Değeri */}
        <KpiCard
          title="Toplam Stok Değeri"
          value={currencyFormat(toplamStokDegeri)}
          icon={<DollarSign size={28} className="text-blue-500" />}
          borderColor="border-blue-200"
          bgColor="bg-blue-50"
        />
      </div>

      {/* --- SEARCH & FILTER --- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-5">
        {/* Search */}
        <div className="flex items-center w-full md:w-60 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:ring-2 focus-within:ring-blue-200">
          <Search className="text-slate-400 mr-2" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün adı ara..."
            className="bg-transparent outline-none text-slate-700 w-full"
          />
        </div>
        {/* Kategori Filter */}
        <div className="flex items-center w-full md:w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 gap-2">
          <Filter size={18} className="text-blue-400" />
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value as Kategori | "")}
            className="bg-transparent outline-none text-slate-700 w-full"
          >
            <option value="">Tüm Kategoriler</option>
            {KATEGORI_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-slate-600 text-left font-semibold">
              <th className="px-5 py-3">Ürün Adı</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3">Son Kullanma Tarihi</th>
              <th className="px-5 py-3">Birim Fiyat</th>
              <th className="px-5 py-3">Stok Durumu</th>
              <th className="px-5 py-3">Notlar</th>
              <th className="px-5 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {tableData.map((s: Stok) => {
              const kritik = s.adet <= s.kritik_seviye;
              return (
                <tr
                  key={s.id}
                  className={clsx(
                    "transition",
                    kritik &&
                      "bg-rose-50/80 border-b-2 border-rose-200 animate-pulse"
                  )}
                >
                  {/* Ürün Adı */}
                  <td className="px-5 py-3 max-w-[210px] font-medium text-slate-900">
                    {s.urun_adi}
                  </td>
                  {/* Kategori */}
                  <td className="px-5 py-3">{s.kategori}</td>
                  {/* Son Kullanma Tarihi */}
                  <td className="px-5 py-3">
                    {s.son_kullanma_tarihi ? (
                      <span className="inline-block bg-blue-50 border border-blue-100 px-2.5 py-1 rounded text-xs text-blue-700">
                        {s.son_kullanma_tarihi}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {/* Birim Fiyat */}
                  <td className="px-5 py-3">{currencyFormat(s.birim_fiyat)}</td>
                  {/* Stok Durumu */}
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    <div className="flex gap-1 items-center">
                      <span
                        className={clsx(
                          "py-0.5 px-2 rounded-lg",
                          kritik
                            ? "bg-rose-100 text-rose-600 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        )}
                      >
                        {s.adet}
                      </span>
                      {kritik && (
                        <span className="flex items-center gap-1 ml-2 text-xs text-rose-500 font-medium animate-pulse">
                          <AlertTriangle size={16} />
                          Kritik Stok!
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Notlar */}
                  <td className="px-5 py-3 text-slate-600">
                    {s.notlar ? (
                      <span className="text-xs">{s.notlar}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  {/* İşlemler */}
                  <td className="px-5 py-3 text-center flex gap-1 justify-center items-center">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-2 rounded text-blue-600 hover:bg-blue-50 transition"
                      title="Düzenle"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      className="p-2 rounded text-rose-600 hover:bg-rose-50 transition"
                      title="Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: Ekle/Düzenle --- */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(null)}>
          <form
            className="bg-white rounded-xl p-8 max-w-md shadow-xl w-full"
            onSubmit={handleFormSubmit}
          >
            <div className="mb-6 flex items-center gap-2 font-semibold text-lg">
              <Package size={22} className="text-blue-500" />
              {modalOpen === "yeni" ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
            </div>
            <div className="space-y-4">
              {/* Ürün Adı */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Ürün Adı
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.urun_adi}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, urun_adi: e.target.value }))
                  }
                />
              </div>
              {/* Kategori */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Kategori
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.kategori}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      kategori: e.target.value as Kategori,
                    }))
                  }
                >
                  {KATEGORI_OPTIONS.map((k) => (
                    <option value={k} key={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              {/* Mevcut Adet */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Mevcut Adet
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.adet}
                  min={0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      adet: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              {/* Kritik Seviye */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Kritik Seviye
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.kritik_seviye}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      kritik_seviye: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              {/* Birim Fiyat */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Birim Fiyat (₺)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.birim_fiyat}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      birim_fiyat: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              {/* Son Kullanma Tarihi */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Son Kullanma Tarihi (SKT)
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.son_kullanma_tarihi || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      son_kullanma_tarihi: e.target.value,
                    }))
                  }
                />
              </div>
              {/* Notlar */}
              <div>
                <label className="block mb-1 text-slate-600 font-medium">
                  Notlar
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none resize-y focus:ring-2 focus:ring-blue-200"
                  value={form.notlar}
                  rows={2}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      notlar: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end mt-8 gap-4">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className={clsx(
                  "px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow disabled:opacity-70"
                )}
              >
                Kaydet
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- Silme Onayı Modal --- */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-8 max-w-md shadow-xl w-full">
            <div className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Trash2 className="text-rose-500" />
              Ürünü Sil
            </div>
            <div className="text-slate-700 mb-8">
              Seçilen ürünü silmek istediğinize emin misiniz?
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow disabled:opacity-70"
              >
                Sil
              </button>
            </div>
          </div>
        </Modal>
      )}
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
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  borderColor: string;
  bgColor: string;
  highlight?: "rose";
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-4 p-5 rounded-xl border shadow-sm",
        borderColor,
        bgColor,
        highlight === "rose" && "animate-pulse"
      )}
    >
      <div className="p-3 bg-white rounded-full shadow-inner">{icon}</div>
      <div>
        <div className="text-slate-700 text-base font-medium">{title}</div>
        <div
          className={clsx(
            "text-2xl md:text-3xl font-extrabold",
            highlight === "rose" ? "text-rose-600" : "text-blue-700"
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// --- Basic Modal ---
function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  React.useEffect(() => {
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
