"use client";

import { useState, useEffect } from "react";
import { X, StickyNote, Check, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function NoteModal({ open, onClose, onSaved }: NoteModalProps) {
  const [baslik, setBaslik] = useState("");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [cokGunlu, setCokGunlu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setBaslik("");
      setBaslangic(new Date().toISOString().slice(0, 10));
      setBitis("");
      setCokGunlu(false);
      setError("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!baslik.trim()) { setError("Not başlığı zorunludur."); return; }
    if (!baslangic) { setError("Tarih zorunludur."); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("takvim_notlari").insert([{
      baslik: baslik.trim(),
      baslangic,
      bitis: cokGunlu && bitis ? bitis : null,
    }]);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <StickyNote size={15} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Takvim Notu Ekle</h3>
              <p className="text-[11px] text-slate-500">Tüm takvimlerde görünür</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-orange-100 rounded-lg text-slate-500 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Not Başlığı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Örn: Randevusuz gün, Kongre, Tatil..."
              maxLength={100}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tarih <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cokGunlu}
              onChange={(e) => { setCokGunlu(e.target.checked); if (!e.target.checked) setBitis(""); }}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-600">Çok günlü not</span>
          </label>

          {cokGunlu && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bitiş Tarihi</label>
              <input
                type="date"
                value={bitis}
                min={baslangic}
                onChange={(e) => setBitis(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition",
                saving ? "bg-orange-400" : "bg-orange-500 hover:bg-orange-600"
              )}
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
