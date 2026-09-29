"use client";

import { useEffect, useRef, useState } from "react";

import content from "@/data/content.json";
import type { AdminProfile } from "@/lib/api";

const copy = content.dashboard;

export function PortalAccount({ admin }: { admin: AdminProfile }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-2xl py-1 pr-1 pl-1 text-left transition hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-deep text-xs font-semibold text-white shadow-sm ring-2 ring-brand-green/30">
          {initials(admin.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-semibold text-slate-800">{admin.name}</span>
          <span className="block text-[11px] text-slate-400">{copy.role}</span>
        </span>
        <svg aria-hidden="true" className={`ml-1 hidden h-4 w-4 text-slate-400 transition sm:block ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]" role="menu">
          <form action="/api/auth/logout" method="post">
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              role="menuitem"
              type="submit"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              {copy.logout}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
