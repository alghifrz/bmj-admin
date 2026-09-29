import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountManager } from "@/components/admin/account-manager";
import content from "@/data/content.json";
import { getCurrentAdmin } from "@/lib/session";

const copy = content.account;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default async function AccountPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/api/auth/end");
  }

  return <AccountManager admin={admin} />;
}
