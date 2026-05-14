"use client";

import { Trash2, LoaderCircle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "Emin misiniz?",
  message,
  confirmLabel = "Evet, Sil",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-7 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 px-7 pb-7">
          <button
            onClick={onCancel}
            disabled={loading}
            type="button"
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            type="button"
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:bg-red-800 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {loading && <LoaderCircle size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
