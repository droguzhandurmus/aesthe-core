"use client";

import React from "react";

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const posClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  const arrowClass = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-800",
    right: "right-full top-1/2 -translate-y-1/2 border-r-slate-800",
  }[side];

  return (
    <div className="relative group/tip inline-flex">
      {children}
      <div
        className={`pointer-events-none absolute ${posClass} px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-[99999]`}
      >
        {label}
        <div className={`absolute border-4 border-transparent ${arrowClass}`} />
      </div>
    </div>
  );
}
