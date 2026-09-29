import { BrandLogo } from "@/components/admin/brand-logo";
import content from "@/data/content.json";
import type { AdminProfile } from "@/lib/api";

import { LogoutControl, PortalNav } from "./portal-nav";

const copy = content.dashboard;

export function PortalSidebar({ admin }: { admin: AdminProfile }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 p-3 lg:block">
      <div className="flex h-[calc(100vh-1.5rem)] flex-col rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="px-5 pt-6 pb-5 flex items-center justify-center flex-col gap-4">
          <Brand />
          <div className="bg-gray-200 w-full h-[1px] rounded-full"/>
        </div>
        <div className="px-5 pb-2">
          <p className="px-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">{copy.menuLabel}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <PortalNav />
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-deep text-xs font-semibold text-white">
              {initials(admin.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{admin.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                {copy.liveStatus}
              </div>
            </div>
          </div>
          <LogoutControl />
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <details className="group border-b border-slate-100 bg-white lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        <Brand compact />
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          {copy.menuLabel}
          <svg aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </span>
      </summary>
      <div className="px-3 pb-4">
        <PortalNav />
        <div className="mt-3 border-t border-slate-100 pt-3">
          <LogoutControl />
        </div>
      </div>
    </details>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <BrandLogo className={compact ? "h-12 w-auto" : "h-16 w-auto max-w-full"} />
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
