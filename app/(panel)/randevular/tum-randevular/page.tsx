"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, LoaderCircle, StickyNote, Eye, EyeOff } from "lucide-react";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { supabase } from "@/lib/supabaseClient";
import CalendarWrapper from "../components/CalendarWrapper";
import YeniRandevuModal, { type NoteForEdit, loadEtiketler } from "../components/YeniRandevuModal";
import { type AppointmentForDetail } from "../components/RandevuDetayModal";


type TakvimNotu = {
  id: string; baslik: string; baslangic: string; bitis: string | null;
  baslangic_saat: string | null; bitis_saat: string | null;
  etiket: string | null; tekrar: string | null; tekrar_bitis: string | null;
};

function getEtiketEmoji(etiket: string | null): string {
  const etiketler = loadEtiketler();
  const found = etiketler.find((e) => e.key === etiket);
  return found?.emoji ?? "📌";
}

function noteToEvents(n: TakvimNotu): EventInput[] {
  const emoji = getEtiketEmoji(n.etiket);
  const base = {
    title: `${emoji} ${n.baslik}`,
    backgroundColor: "#F97316", borderColor: "#EA580C", textColor: "#fff",
    extendedProps: { isNote: true, noteId: n.id },
  };
  // Gün aşan saatli not (range + saat)
  if (n.bitis && n.baslangic_saat && (!n.tekrar || n.tekrar === "yok")) {
    return [{
      ...base, id: `note-${n.id}-0`,
      start: `${n.baslangic}T${n.baslangic_saat}`,
      end: n.bitis_saat ? `${n.bitis}T${n.bitis_saat}` : `${n.bitis}T${n.baslangic_saat}`,
      allDay: false,
    }];
  }
  const isTimed = !!n.baslangic_saat;
  function makeEvent(date: string, idx: number): EventInput {
    if (isTimed) {
      return { ...base, id: `note-${n.id}-${idx}`, start: `${date}T${n.baslangic_saat}`,
        end: n.bitis_saat ? `${date}T${n.bitis_saat}` : undefined, allDay: false };
    }
    let end: string | undefined;
    if (idx === 0 && n.bitis) { const d = new Date(n.bitis); d.setDate(d.getDate() + 1); end = d.toISOString().slice(0, 10); }
    return { ...base, id: `note-${n.id}-${idx}`, start: date, end, allDay: true };
  }
  if (!n.tekrar || n.tekrar === "yok") return [makeEvent(n.baslangic, 0)];
  const limitDate = n.tekrar_bitis ? new Date(n.tekrar_bitis) : (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
  const events: EventInput[] = [];
  const cur = new Date(n.baslangic);
  let i = 0;
  while (cur <= limitDate && i < 365) {
    events.push(makeEvent(cur.toISOString().slice(0, 10), i++));
    if (n.tekrar === "gunluk") cur.setDate(cur.getDate() + 1);
    else if (n.tekrar === "haftalik") cur.setDate(cur.getDate() + 7);
    else if (n.tekrar === "aylik") cur.setMonth(cur.getMonth() + 1);
    else if (n.tekrar?.startsWith("ozel:")) {
      const parts = n.tekrar.split(":");
      const interval = parseInt(parts[1] ?? "1", 10) || 1;
      cur.setDate(cur.getDate() + interval);
    } else break;
  }
  return events;
}

// Kategori renkleri — modal butonlarıyla birebir eşleşir
const KATEGORI_COLOR: Record<string, string> = {
  "Görüşme":     "#7C3AED", // violet-600
  "Klinik İşlem":"#0284C7", // sky-600
  "Ameliyat":    "#E11D48", // rose-600
  "Kontrol":     "#059669", // emerald-600
};

// Kategori yoksa durum rengine dön
const DURUM_COLOR: Record<string, string> = {
  Bekliyor:    "#F59E0B",
  Onaylandı:   "#10B981",
  İptal:       "#EF4444",
  Tamamlandı:  "#6B7280",
};

function eventColor(islemTuru: string | undefined, durum: string | undefined): string {
  if (islemTuru) {
    for (const kat of Object.keys(KATEGORI_COLOR)) {
      if (islemTuru === kat || islemTuru.startsWith(`${kat}: `)) {
        return KATEGORI_COLOR[kat];
      }
    }
  }
  return DURUM_COLOR[durum ?? "Bekliyor"] ?? "#F59E0B";
}

function toLocalISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset(); // Turkey = +180
  const sign = offset >= 0 ? "+" : "-";
  const absOff = Math.abs(offset);
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:00` +
    `${sign}${p(Math.floor(absOff / 60))}:${p(absOff % 60)}`
  );
}

export default function TumRandevularPage() {
  const searchParams = useSearchParams();
  const [randevular, setRandevular] = useState<AppointmentForDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentForDetail | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();
  const [initialSure, setInitialSure] = useState<number | undefined>();

  // Takvim notları
  const [notlar, setNotlar] = useState<TakvimNotu[]>([]);
  const [showNotlar, setShowNotlar] = useState(true);
  const [modalInitialMode, setModalInitialMode] = useState<"randevu" | "not">("randevu");
  const [selectedNote, setSelectedNote] = useState<NoteForEdit | null>(null);
  const [modalDefaultNDM, setModalDefaultNDM] = useState<"timed" | "allday" | "range">("allday");
  const [defaultEndDate, setDefaultEndDate] = useState<string | undefined>();

  const fetchRandevular = useCallback(async () => {
    const { data, error } = await supabase
      .from("randevular")
      .select("id, hasta_id, tarih, islem_turu, sure_dk, notlar, durum, hastalar(id, ad_soyad, telefon)")
      .order("tarih", { ascending: true });
    setLoading(false);
    if (error) { console.error("fetchRandevular hatası:", error); return; }
    console.log("fetchRandevular:", data?.length, "kayıt");
    if (data) setRandevular(data as unknown as AppointmentForDetail[]);
  }, []);

  const fetchNotlar = useCallback(async () => {
    const { data } = await supabase.from("takvim_notlari").select("*").order("baslangic");
    if (data) setNotlar(data as TakvimNotu[]);
  }, []);

  useEffect(() => { fetchRandevular(); fetchNotlar(); }, [fetchRandevular, fetchNotlar]);

  // URL'den randevuId parametresi gelirse modalı otomatik aç
  useEffect(() => {
    const randevuId = searchParams.get("randevuId");
    if (!randevuId || randevular.length === 0) return;
    const appt = randevular.find(r => String(r.id) === randevuId);
    if (appt) {
      setSelectedAppt(appt);
      setDefaultDate(undefined);
      setDefaultTime(undefined);
      setInitialSure(undefined);
      setModalInitialMode("randevu");
      setModalOpen(true);
      window.history.replaceState({}, "", "/randevular/tum-randevular");
    }
  }, [searchParams, randevular]);


  const calendarEvents: EventInput[] = useMemo(() => {
    const apptEvents = randevular.map((r) => {
      const start = r.tarih;
      const endDate = new Date(start);
      endDate.setMinutes(endDate.getMinutes() + (r.sure_dk ?? 60));
      const color = eventColor(r.islem_turu, r.durum);
      const hastaAdi = r.hastalar?.ad_soyad ?? "—";
      const rawIslem = r.islem_turu && r.islem_turu !== "Belirtilmedi" ? r.islem_turu : "";
      const colonIdx = rawIslem.indexOf(": ");
      const islem = colonIdx !== -1 ? rawIslem.slice(colonIdx + 2) : rawIslem;
      return {
        id: r.id.toString(),
        title: islem ? `${hastaAdi} — ${islem}` : hastaAdi,
        start,
        end: toLocalISO(endDate),
        backgroundColor: color,
        borderColor: color,
        textColor: "#fff",
        extendedProps: { appointment: r },
      } satisfies EventInput;
    });
    if (!showNotlar) return apptEvents;
    return [...apptEvents, ...(notlar.flatMap(noteToEvents) as EventInput[])];
  }, [randevular, notlar, showNotlar]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    if (arg.event.extendedProps?.isNote) {
      const noteId = arg.event.extendedProps.noteId as string;
      const note = notlar.find(n => n.id === noteId) ?? null;
      if (note) {
        setSelectedNote(note as NoteForEdit);
        setModalInitialMode("not");
        setSelectedAppt(null);
        setDefaultDate(undefined);
        setDefaultTime(undefined);
        setInitialSure(undefined);
        setModalOpen(true);
      }
      return;
    }
    const appt = arg.event.extendedProps?.appointment as AppointmentForDetail | undefined;
    if (!appt) return;
    setSelectedAppt(appt);
    setDefaultDate(undefined);
    setDefaultTime(undefined);
    setInitialSure(undefined);
    setModalOpen(true);
  }, [notlar]);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    const p = (n: number) => String(n).padStart(2, "0");
    setSelectedAppt(null);
    setSelectedNote(null);

    const startDateStr = `${arg.start.getFullYear()}-${p(arg.start.getMonth() + 1)}-${p(arg.start.getDate())}`;
    const endDateStr = arg.end
      ? `${arg.end.getFullYear()}-${p(arg.end.getMonth() + 1)}-${p(arg.end.getDate())}`
      : startDateStr;
    const isCrossDay = !arg.allDay && endDateStr !== startDateStr;

    setDefaultDate(startDateStr);
    setDefaultTime(!arg.allDay ? `${p(arg.start.getHours())}:${p(arg.start.getMinutes())}` : undefined);

    let defaultNDM: "timed" | "allday" | "range";
    let endDate: string | undefined;

    if (arg.allDay) {
      const durationDays = arg.end ? Math.round((arg.end.getTime() - arg.start.getTime()) / 86400000) : 1;
      if (durationDays > 1 && arg.end) {
        defaultNDM = "range";
        const endD = new Date(arg.end);
        endD.setDate(endD.getDate() - 1);
        endDate = `${endD.getFullYear()}-${p(endD.getMonth() + 1)}-${p(endD.getDate())}`;
      } else {
        defaultNDM = "allday";
      }
    } else if (isCrossDay) {
      defaultNDM = "range";
      endDate = endDateStr;
    } else {
      defaultNDM = "timed";
    }

    setModalDefaultNDM(defaultNDM);
    setDefaultEndDate(endDate);
    const dk = !arg.allDay && arg.end
      ? Math.round((arg.end.getTime() - arg.start.getTime()) / 60000)
      : 30;
    setInitialSure(dk > 0 ? dk : 30);
    setModalInitialMode(arg.allDay || isCrossDay ? "not" : "randevu");
    setModalOpen(true);
  }, []);

  const handleEventDrop = useCallback(async (arg: EventDropArg) => {
    const id = arg.event.id; // UUID string — Number() yapma, NaN olur
    const newStart = arg.event.start;
    if (!newStart) return;
    const newTarih = toLocalISO(newStart);
    const { error } = await supabase
      .from("randevular")
      .update({ tarih: newTarih })
      .eq("id", id);
    if (error) {
      arg.revert();
    } else {
      setRandevular((prev) => prev.map((r) => String(r.id) === id ? { ...r, tarih: newTarih } : r));
    }
  }, []);

  const handleEventResize = useCallback(async (arg: EventResizeDoneArg) => {
    const id = arg.event.id; // UUID string
    const newStart = arg.event.start;
    const newEnd = arg.event.end;
    if (!newStart || !newEnd) return;
    const yeniSure = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
    const newTarih = toLocalISO(newStart);
    const { error } = await supabase
      .from("randevular")
      .update({ tarih: newTarih, sure_dk: yeniSure })
      .eq("id", id);
    if (error) {
      arg.revert();
    } else {
      setRandevular((prev) => prev.map((r) => String(r.id) === id ? { ...r, tarih: newTarih, sure_dk: yeniSure } : r));
    }
  }, []);

  function openNewModal(mode: "randevu" | "not" = "randevu") {
    setSelectedAppt(null);
    setSelectedNote(null);
    setDefaultDate(undefined);
    setDefaultTime(undefined);
    setInitialSure(undefined);
    setModalDefaultNDM("allday");
    setDefaultEndDate(undefined);
    setModalInitialMode(mode);
    setModalOpen(true);
  }

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-blue-800 tracking-tight">Tüm Randevular</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotlar((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm transition"
          >
            {showNotlar ? <EyeOff size={15} /> : <Eye size={15} />}
            {showNotlar ? "Notları Gizle" : "Notları Göster"}
          </button>
          <button
            onClick={() => openNewModal("not")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 shadow-sm transition"
          >
            <StickyNote size={15} /> Not Ekle
          </button>
          <button
            onClick={() => openNewModal("randevu")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition"
          >
            <Plus size={16} /> Yeni Randevu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border border-slate-100 p-4 md:p-6">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl">
              <LoaderCircle size={32} className="animate-spin text-blue-500" />
            </div>
          )}
          <CalendarWrapper
            events={calendarEvents}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
          />
        </div>
      </div>

      <YeniRandevuModal
        open={modalOpen}
        onClose={() => { setSelectedNote(null); setModalOpen(false); }}
        appointment={selectedAppt}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        initialSure={initialSure}
        defaultEndDate={defaultEndDate}
        initialMode={modalInitialMode}
        defaultNoteDateMode={modalDefaultNDM}
        editNote={selectedNote}
        onSaved={() => { setModalOpen(false); fetchRandevular(); }}
        onDeleted={() => { setModalOpen(false); fetchRandevular(); }}
        onNoteSaved={() => { setSelectedNote(null); setModalOpen(false); fetchNotlar(); }}
      />
    </div>
  );
}
