import "server-only";

import { redirect } from "next/navigation";

import content from "@/data/content.json";
import { apiRequest, errorCode, readBody, type SuccessBody } from "@/lib/api";
import { productListQuery, type CatalogCategory, type CategoryOption, type LoadResult, type ProductFilters, type ProductList } from "@/lib/catalog";
import { readSessionToken } from "@/lib/session";

const copy = content.products;

export async function loadProducts(filters: ProductFilters): Promise<LoadResult<ProductList>> {
  return loadAdmin<ProductList>(`/api/v1/admin/products?${productListQuery(filters).toString()}`, (data) => {
    if (!data || !Array.isArray(data.items) || typeof data.total !== "number") return null;
    return data;
  });
}

export async function loadCategories(): Promise<LoadResult<CategoryOption[]>> {
  return loadAdmin<CategoryOption[]>("/api/v1/admin/categories", (data) => (Array.isArray(data) ? data : null));
}

export async function loadAdminCategories(): Promise<LoadResult<CatalogCategory[]>> {
  return loadAdmin<CatalogCategory[]>("/api/v1/admin/categories", (data) => (Array.isArray(data) ? data : null));
}

async function loadAdmin<T>(path: string, accept: (data: T | null) => T | null): Promise<LoadResult<T>> {
  const token = await readSessionToken();
  if (!token) redirect("/api/auth/end");

  let response: Response;
  try {
    response = await apiRequest(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: copy.errors.unavailable };
  }

  if (response.status === 401) redirect("/api/auth/end");

  const body = await readBody<SuccessBody<T>>(response);
  const data = accept(body?.data ?? null);
  if (!response.ok || !data) {
    return { ok: false, error: messageFor(errorCode(body)) };
  }
  return { ok: true, data };
}

function messageFor(code: string | undefined) {
  if (code === "SLUG_ALREADY_EXISTS") return copy.errors.slug;
  if (code === "CATEGORY_NOT_FOUND") return copy.errors.category;
  if (code === "PRODUCT_NOT_FOUND") return copy.errors.missing;
  if (code === "INVALID_REQUEST" || code === "INVALID_QUERY" || code === "ALREADY_EXISTS") return copy.errors.invalid;
  return copy.errors.unavailable;
}
