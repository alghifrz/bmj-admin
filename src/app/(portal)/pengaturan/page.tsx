import type { Metadata } from "next";

import { StoreManager } from "@/components/admin/store-manager";
import content from "@/data/content.json";

const copy = content.store;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default function SettingsPage() {
  return <StoreManager />;
}
