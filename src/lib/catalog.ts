export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type CatalogCategory = CategoryOption & {
  description: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type CatalogProduct = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  material: string | null;
  size: string | null;
  function: string | null;
  included_components: string | null;
  specifications: string | null;
  additional_information: string | null;
  price: string | null;
  price_visible: boolean;
  availability: string | null;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  image_url: string | null;
  category: {
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
};

export type ProductList = {
  items: CatalogProduct[];
  page: number;
  limit: number;
  total: number;
};

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ProductFilters = {
  search: string;
  category: string;
  availability: string;
  sort: string;
  page: number;
};

const sorts = new Set(["featured", "newest", "name_asc", "name_desc", "price_asc", "price_desc"]);
const availabilityFilters = new Set(["available", "contact_us", "out_of_stock"]);

export const productPageSize = 8;

export function readProductFilters(params: Record<string, string | string[] | undefined>): ProductFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const page = Number(one("page"));
  const sort = one("sort");
  const availability = one("availability");

  return {
    search: one("search").slice(0, 100),
    category: one("category").slice(0, 200),
    availability: availabilityFilters.has(availability) ? availability : "",
    sort: sorts.has(sort) ? sort : "featured",
    page: Number.isInteger(page) && page >= 1 && page <= 10000 ? page : 1,
  };
}

export function productListQuery(filters: ProductFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(productPageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort);
  return params;
}

export function productPageHref(filters: ProductFilters) {
  const params = productListQuery(filters);
  params.delete("limit");
  if (filters.page <= 1) params.delete("page");
  const query = params.toString();
  return query ? `/produk?${query}` : "/produk";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export function validSlug(value: string) {
  return value.length > 0 && value.length <= 200 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function validPrice(value: string) {
  return value === "" || /^\d{1,12}(\.\d{1,2})?$/.test(value);
}
