import type { Metadata } from "next";

import { ReviewsManager } from "@/components/admin/reviews-manager";
import content from "@/data/content.json";

const copy = content.reviews;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReviewsManager initialQuery={readSearch(await searchParams)} />;
}

function readSearch(params: Record<string, string | string[] | undefined>) {
  const value = params.search;
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}
