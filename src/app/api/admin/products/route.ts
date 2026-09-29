import { proxyAdminRead, proxyAdminWrite } from "@/lib/admin-proxy";
import { productListQuery, readProductFilters } from "@/lib/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = readProductFilters(Object.fromEntries(url.searchParams));
  return proxyAdminRead(`/api/v1/admin/products?${productListQuery(filters)}`);
}

export async function POST(request: Request) {
  return proxyAdminWrite(request, "/api/v1/admin/products");
}
