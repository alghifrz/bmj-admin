import type { Metadata } from "next";

import { ProductsManager } from "@/components/admin/products-manager";
import content from "@/data/content.json";
import { readProductFilters } from "@/lib/catalog";

const copy = content.products;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProductsManager initialFilters={readProductFilters(await searchParams)} />;
}
