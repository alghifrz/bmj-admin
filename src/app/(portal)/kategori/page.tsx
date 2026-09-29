import type { Metadata } from "next";

import { CategoriesManager } from "@/components/admin/categories-manager";
import content from "@/data/content.json";

const copy = content.categories;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CategoriesManager initialQuery={readSearch(await searchParams)} />;
}

function readSearch(params: Record<string, string | string[] | undefined>) {
  const value = params.search;
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}
