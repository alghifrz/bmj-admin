import { Plus_Jakarta_Sans } from "next/font/google";
import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/admin/portal-header";
import { MobileNav, PortalSidebar } from "@/components/admin/portal-sidebar";
import { getCurrentAdmin } from "@/lib/session";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/api/auth/end");
  }

  return (
    <div className={`${jakarta.className} fixed inset-0 flex overflow-hidden bg-[#f8fafc] text-slate-800 antialiased`}>
      <PortalSidebar admin={admin} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav />
        <PortalHeader admin={admin} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-12">{children}</main>
      </div>
    </div>
  );
}
