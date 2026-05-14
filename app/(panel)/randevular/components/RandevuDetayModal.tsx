"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Check, Trash2, LoaderCircle, User, Clock, Clipboard, Phone, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

export type AppointmentForDetail = {
  id: number;
  hasta_id: number;
  tarih: string;
  islem_turu: string;
  sure_dk?: number;
  notlar: string | null;
  durum?: string;
  hastalar?: { id: number; ad_soyad: string; telefon?: string };
};

const DURUM_OPTIONS = ["Bekliyor", "Onaylandı", "İptal", "Tamamlandı"];

const DURUM_STYLE: Record<string, string> = {
  "Bekliyor": "bg-amber-50 text-amber-700 border-amber-200",
  "Onaylandı": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "İptal": "bg-red-50 text-red-700 border-red-200",
  "Tamamlandı": "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const gun = d.getDate().toString().padStart(2, "0");
  const ay = (d.getMonth() + 1).toString().padStart(2, "0");
  const yil = d.getFullYear();
  const saat = d.getHours().toString().padStart(2, "0");
  const dk = d.getMinutes().toString().padStart(2, "0");
  return `${gun}.${ay}.${yil} — ${saat}:${dk}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentForDetail | null;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function RandevuDetayModal({ open, onClose, appointment, onSaved, onDeleted }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [durum, setDurum] = useState(appointment?.durum ?? "Bekliyor");
  const [notlar, setNotlar] = useState(appointment?.notlar ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (appointment) {
      setDurum(appointment.durum ?? "Bekliyor");
      setNotlar(appointment.notlar ?? "");
      setEditMode(false);
      setError("");
    }
  }, [appointment]);

  async function handleSave() {
    if (!appointment) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("randevular")
      .update({ durum, notlar: notlar || null })
      .eq("id", appointment.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditMode(false);
    onSaved();
  }

  async function handleDelete() {
    if (!appointment) return;
    if (!window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
    setDeleting(true);
    await supabase.from("randevular").delete().eq("id", appointment.id);
    setDeleting(false);
    onDeleted();
    onClose();
  }

  if (!open || !appointment) return null;

  const hastaAdi = appointment.hastalar?.ad_soyad ?? "-";
  const hastaId = appointment.hasta_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <span className="font-semibold text-blue-700">Randevu Detayı</span>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded transition" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Hasta */}
          <div className="flex items-center gap-2">
            <User size={17} className="text-blue-500 shrink-0" />
            <Link
              href={`/hastalar/hasta-listesi/${hastaId}`}
              className="font-semibold text-blue-700 hover:underline text-base"
              onClick={onClose}
            >
              {hastaAdi}
            </Link>
            {appointment.hastalar?.telefon && (
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                <Phone size={13} />
                {appointment.hastalar.telefon}
              </span>
            )}
          </div>

          {/* Tarih / Saat / Süre */}
          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-slate-400" />
              {formatDateTime(appointment.tarih)}
            </span>
            {appointment.sure_dk && (
              <span className="flex items-center gap-1 text-slate-500">
                · {appointment.sure_dk} dk
              </span>
            )}
          </div>

          {/* İşlem */}
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clipboard size={15} className="text-slate-400 shrink-0" />
            <span>{appointment.islem_turu || "Belirtilmedi"}</span>
          </div>

          {/* Durum */}
          {!editMode ? (
            <div>
              <span className={clsx(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
                DURUM_STYLE[appointment.durum ?? "Bekliyor"] ?? DURUM_STYLE["Bekliyor"]
              )}>
                {appointment.durum ?? "Bekliyor"}
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Durum</label>
              <select
                value={durum}
                onChange={(e) => setDurum(e.target.value)}
                disabled={saving}
                className="w-full border rounded py-2 px-3 text-sm focus:outline-blue-500 bg-white"
              >
                {DURUM_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notlar */}
          {!editMode ? (
            appointment.notlar ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2 border border-slate-100">
                {appointment.notlar}
              </p>
            ) : null
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notlar</label>
              <textarea
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                rows={3}
                disabled={saving}
                className="w-full border rounded py-2 px-3 text-sm focus:outline-blue-500 resize-none"
                placeholder="Not ekle..."
                maxLength={300}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Butonlar */}
          {!editMode ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditMode(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-sm font-medium hover:bg-blue-100 transition"
              >
                <Pencil size={14} /> Düzenle
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm font-medium hover:bg-red-100 transition disabled:opacity-60"
              >
                {deleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Sil
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditMode(false)}
                disabled={saving}
                className="flex-1 py-2 border text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={clsx(
                  "flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition",
                  saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                Kaydet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
