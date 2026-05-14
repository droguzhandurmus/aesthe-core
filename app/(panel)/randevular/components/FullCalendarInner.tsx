"use client";

import { useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import type {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];
const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
};
const BUTTON_TEXT = { today: "Bugün", month: "Ay", week: "Hafta", day: "Gün", list: "Liste" };
const BUSINESS_HOURS = { daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: "09:00", endTime: "19:00" };
const EVENT_TIME_FORMAT = { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false };
const SLOT_LABEL_FORMAT = { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false };

const FC_STYLE_ID = "__fc-google-theme-global";

function injectCalendarCSS() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(FC_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = FC_STYLE_ID;
    document.head.appendChild(style);
  }
  style.innerHTML = `
    .fc .fc-scrollgrid, .fc-theme-standard .fc-scrollgrid,
    .fc .fc-scrollgrid-section, .fc .fc-scrollgrid-sync-table,
    .fc .fc-daygrid-day, .fc .fc-timegrid-slot, .fc .fc-col-header-cell {
      border-color: #e2e8f0 !important;
    }
    .fc .fc-day-today { background: #eff6ff !important; }
    .fc .fc-day-today .fc-daygrid-day-number { font-weight: 700; color: #2563eb; }
    .fc .fc-col-header-cell-cushion { font-weight: 600; color: #1e40af; font-size: 13px; }
    .fc .fc-timegrid-axis-cushion { color: #94a3b8; font-size: 12px; }
    .fc .fc-toolbar-title { font-size: 1.15rem; font-weight: 700; color: #1e3a8a; }
    .fc .fc-button {
      background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;
      border-radius: 0.5rem; font-size: 13px; font-weight: 500;
      padding: 5px 12px; transition: all 0.15s;
    }
    .fc .fc-button:hover { background: #dbeafe; }
    .fc .fc-button-primary:not(:disabled).fc-button-active,
    .fc .fc-button-primary:not(:disabled):active {
      background: #2563eb !important; color: #fff !important; border-color: #2563eb !important;
    }
    .fc .fc-today-button { background: #2563eb !important; color: #fff !important; border-color: #2563eb !important; }
    .fc .fc-daygrid-event, .fc .fc-timegrid-event { border-radius: 5px !important; }

    /* All-day notlar: event içeriği ortala */
    .fc-timegrid .fc-daygrid-body .fc-daygrid-day-top { display: none; }
    .fc-timegrid .fc-daygrid-body .fc-daygrid-event-harness .fc-daygrid-event {
      display: flex !important;
      align-items: center !important;
    }
    .fc .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
    .fc .fc-timegrid-now-indicator-arrow { border-top-color: #ef4444; border-bottom-color: #ef4444; }
    .fc .fc-non-business { background: rgba(241,245,249,0.5); }
    .fc-list-event:hover td { background: #eff6ff !important; cursor: pointer; }
    .fc-list-event-dot { display: none; }
    .fc-list-day-cushion { background: #f8fafc !important; }
    .fc-list-day-text, .fc-list-day-side-text { color: #1e40af !important; font-weight: 600; }
  `;
  document.head.appendChild(style);
}

export interface FullCalendarInnerProps {
  events: EventInput[];
  onEventClick: (arg: EventClickArg) => void;
  onDateSelect: (arg: DateSelectArg) => void;
  onEventDrop: (arg: EventDropArg) => void;
  onEventResize: (arg: EventResizeDoneArg) => void;
}

const CALENDAR_DATE_KEY = "ac_calendar_date";

function getSavedDate(): string | undefined {
  try { return localStorage.getItem(CALENDAR_DATE_KEY) ?? undefined; } catch { return undefined; }
}

function saveDate(dateStr: string) {
  try { localStorage.setItem(CALENDAR_DATE_KEY, dateStr); } catch { /* ignore */ }
}

export default function FullCalendarInner({
  events,
  onEventClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
}: FullCalendarInnerProps) {
  const initialDate = getSavedDate();

  useEffect(() => { injectCalendarCSS(); }, []);

  // All-day notların satır yüksekliğini eşit böl
  useEffect(() => {
    let raf = 0;

    function fixAllDayHeights() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const body = document.querySelector<HTMLElement>(".fc-timegrid .fc-daygrid-body");
        if (!body) return;
        body.querySelectorAll<HTMLElement>(".fc-daygrid-day-frame").forEach((frame) => {
          const harnesses = Array.from(
            frame.querySelectorAll<HTMLElement>(".fc-daygrid-event-harness")
          );
          const n = harnesses.length;
          if (n === 0) return;
          const frameH = frame.offsetHeight;
          if (frameH < 8) return;
          const gap = 2;
          const pad = 2;
          const eachH = Math.max(18, Math.floor((frameH - pad * 2 - gap * (n - 1)) / n));
          harnesses.forEach((el, i) => {
            el.style.position = "absolute";
            el.style.top = `${pad + i * (eachH + gap)}px`;
            el.style.left = "2px";
            el.style.right = "2px";
            el.style.height = `${eachH}px`;
            el.style.marginBottom = "0";
            const inner = el.querySelector<HTMLElement>(".fc-daygrid-event");
            if (inner) inner.style.height = "100%";
          });
        });
      });
    }

    const timer = setTimeout(fixAllDayHeights, 150);
    const observer = new MutationObserver(fixAllDayHeights);
    const root = document.querySelector(".fc");
    if (root) observer.observe(root, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <FullCalendar
      plugins={PLUGINS}
      initialView="timeGridWeek"
      initialDate={initialDate}
      locale={trLocale}
      headerToolbar={HEADER_TOOLBAR}
      buttonText={BUTTON_TEXT}
      slotMinTime="07:00:00"
      slotMaxTime="21:00:00"
      slotDuration="00:30:00"
      nowIndicator
      weekends
      businessHours={BUSINESS_HOURS}
      height="calc(100vh - 220px)"
      selectable
      selectMirror
      editable
      eventResizableFromStart
      eventDurationEditable
      dragScroll
      events={events}
      select={onDateSelect}
      eventClick={onEventClick}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      dayMaxEventRows={10}
      displayEventEnd
      eventTimeFormat={EVENT_TIME_FORMAT}
      slotLabelFormat={SLOT_LABEL_FORMAT}
      datesSet={(arg) => {
        const d = arg.start;
        const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        saveDate(local);
      }}
    />
  );
}
