import content from "@/data/content.json";

import type { AdminProfile } from "@/lib/api";
import { PortalAccount } from "@/components/admin/portal-account";
import { PortalSearch } from "@/components/admin/portal-search";

const copy = content.dashboard;

export function PortalHeader({ admin }: { admin: AdminProfile }) {
  return (
    <header className="relative z-20 m-3 flex h-20 shrink-0 items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white px-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:px-8">
      <div className="flex w-1/2 items-center">
        <PortalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">

        <div className="hidden items-center gap-2 rounded-lg border border-brand-green/30 bg-brand-green/15 px-3 py-1.5 text-xs font-semibold text-brand-green-deep md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-green" />
          {copy.liveStatus}
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <PortalAccount admin={admin} />
      </div>
    </header>
  );
}
