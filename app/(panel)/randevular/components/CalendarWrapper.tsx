"use client";

import dynamic from "next/dynamic";
import type { FullCalendarInnerProps } from "./FullCalendarInner";

// FullCalendar'ı SSR'sız, lazy olarak yükle — React 19 uyumluluk için
const CalendarWrapper = dynamic<FullCalendarInnerProps>(
  () => import("./FullCalendarInner"),
  { ssr: false }
);

export default CalendarWrapper;
