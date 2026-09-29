"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { ProductImages, ProductPhoto, uploadProductImage } from "@/components/admin/product-images";
import content from "@/data/content.json";
import {
  productListQuery,
  productPageHref,
  slugify,
  validPrice,
  validSlug,
  type CatalogProduct,
  type CategoryOption,
  type ProductFilters,
  type LoadResult,
  type ProductList,
} from "@/lib/catalog";

const copy = content.products;

const availabilityOptions = [
  { value: "Available", label: copy.availabilityAvailable },
  { value: "Contact Us", label: copy.availabilityContact },
  { value: "Out of Stock", label: copy.availabilityOut },
] as const;

const sortOptions = [
  { value: "featured", label: copy.sortFeatured },
  { value: "newest", label: copy.sortNewest },
  { value: "name_asc", label: copy.sortNameAsc },
  { value: "name_desc", label: copy.sortNameDesc },
  { value: "price_asc", label: copy.sortPriceAsc },
  { value: "price_desc", label: copy.sortPriceDesc },
] as const;

type Draft = {
  name: string;
  slug: string;
  category_id: string;
  brand: string;
  model: string;
  short_description: string;
  description: string;
  price: string;
  price_visible: boolean;
  availability: string;
  is_published: boolean;
  is_featured: boolean;
  display_order: string;
  material: string;
  size: string;
  usage: string;
  included_components: string;
  specifications: string;
  additional_information: string;
};

export function ProductsManager({ initialFilters }: { initialFilters: ProductFilters }) {
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState(initialFilters.search);
  const [list, setList] = useState<LoadResult<ProductList> | null>(null);
  const [categories, setCategories] = useState<LoadResult<CategoryOption[]> | null>(null);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<CatalogProduct | "new" | null>(null);
  const [removing, setRemoving] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    setSearch((current) => (current === initialFilters.search ? current : initialFilters.search));
    setFilters((current) => (sameFilters(current, initialFilters) ? current : initialFilters));
  }, [initialFilters.search, initialFilters.category, initialFilters.availability, initialFilters.sort, initialFilters.page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (current.search === search ? current : { ...current, search, page: 1 }));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const href = productPageHref(filters);
    if (`${window.location.pathname}${window.location.search}` !== href) {
      window.history.replaceState(null, "", href);
    }
    const controller = new AbortController();
    void loadProductList(filters, controller.signal).then((result) => {
      if (!controller.signal.aborted && result) setList(result);
    });
    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    void loadCategoryOptions(controller.signal).then((result) => {
      if (!controller.signal.aborted && result) setCategories(result);
    });
    return () => controller.abort();
  }, []);

  const categoryOptions = categories?.ok ? categories.data : [];
  const filtered = hasFilters(filters);

  function applyFilters(next: Partial<ProductFilters>) {
    setFilters((current) => ({ ...current, page: 1, ...next }));
  }

  function patchProduct(id: string, patch: Partial<CatalogProduct>) {
    setList((current) => {
      if (!current?.ok) return current;
      return {
        ok: true,
        data: {
          ...current.data,
          items: current.data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        },
      };
    });
  }

  async function toggle(product: CatalogProduct, patch: { is_published?: boolean; is_featured?: boolean }) {
    const previous = { is_published: product.is_published, is_featured: product.is_featured };
    patchProduct(product.id, patch);
    const result = await sendProduct("PATCH", `/api/admin/products/${product.id}`, patch);
    if (!result.ok) {
      patchProduct(product.id, previous);
      setNotice(result.error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        <button
          className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!categories?.ok || categoryOptions.length === 0}
          onClick={() => {
            setNotice("");
            setEditor("new");
          }}
          type="button"
        >
          {copy.add}
        </button>
      </header>

      {categories?.ok && categoryOptions.length === 0 ? (
        <Notice>
          <p className="font-semibold text-slate-800">{copy.noCategoryTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{copy.noCategoryBody}</p>
          <Link className="mt-3 inline-flex text-sm font-semibold text-brand-green-deep" href="/kategori">
            {copy.manageCategories}
          </Link>
        </Notice>
      ) : null}

      {categories && !categories.ok ? <Notice>{categories.error}</Notice> : null}
      {notice ? <Notice>{notice}</Notice> : null}

      <section className="dashboard-card rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="block">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              className={fieldClass}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              value={search}
            />
          </label>
          <Select
            label={copy.category}
            onChange={(value) => applyFilters({ category: value })}
            value={filters.category}
          >
            <option value="">{copy.allCategories}</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
                {category.is_active ? "" : ` (${copy.inactiveCategory})`}
              </option>
            ))}
          </Select>
          <Select
            label={copy.availability}
            onChange={(value) => applyFilters({ availability: value })}
            value={filters.availability}
          >
            <option value="">{copy.allAvailability}</option>
            <option value="available">{copy.availabilityAvailable}</option>
            <option value="contact_us">{copy.availabilityContact}</option>
            <option value="out_of_stock">{copy.availabilityOut}</option>
          </Select>
          <Select label={copy.sortFeatured} onChange={(value) => applyFilters({ sort: value })} value={filters.sort}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {!list || !categories ? (
          <div className="mt-6 space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : !list.ok ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-600">{list.error}</p>
            <button className="mt-4 text-sm font-semibold text-brand-green-deep" onClick={() => setFilters((current) => ({ ...current }))} type="button">
              {copy.retry}
            </button>
          </div>
        ) : list.data.total === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-slate-800">{filtered ? copy.noMatch : copy.emptyTitle}</p>
            {filtered ? null : <p className="mt-1 text-sm text-slate-500">{copy.emptyBody}</p>}
            {filtered ? (
              <button
                className="mt-4 text-sm font-semibold text-brand-green-deep"
                onClick={() => {
                  setSearch("");
                  setFilters(blankFilters());
                }}
                type="button"
              >
                {copy.reset}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs font-medium text-slate-400">
              {copy.showing} {rangeStart(list.data)}–{rangeEnd(list.data)} {copy.of} {list.data.total} {copy.unit}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-215 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] tracking-wider text-slate-400 uppercase">
                    {copy.columns.map((column) => (
                      <th className="px-3 py-3 font-semibold" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.items.map((product) => (
                    <tr className="align-middle transition-colors hover:bg-slate-50" key={product.id}>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <ProductPhoto alt="" className="h-12 w-12" src={product.image_url} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {[product.brand, product.model].filter(Boolean).join(" · ") || product.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{product.category.name}</td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-800">{product.price ? formatIdr(product.price) : copy.priceEmpty}</div>
                        {product.price && !product.price_visible ? (
                          <div className="mt-1 text-[11px] font-medium text-slate-400">{copy.priceHidden}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-4">
                        <AvailabilityBadge value={product.availability} />
                      </td>
                      <td className="px-3 py-4">
                        <Switch
                          checked={product.is_published}
                          label={product.is_published ? copy.published : copy.draft}
                          onChange={(checked) => void toggle(product, { is_published: checked })}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <Switch
                          checked={product.is_featured}
                          label={copy.featuredOn}
                          onChange={(checked) => void toggle(product, { is_featured: checked })}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-green-deep hover:bg-brand-green/10" onClick={() => setEditor(product)} type="button">
                            {copy.edit}
                          </button>
                          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={() => setRemoving(product)} type="button">
                            {copy.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager data={list.data} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
          </>
        )}
      </section>

      {editor ? (
        <ProductEditor
          categories={categoryOptions}
          product={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onImagesChanged={() => setFilters((current) => ({ ...current }))}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            setFilters((current) => ({ ...current }));
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDelete
          product={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            setNotice(copy.deleted);
            setFilters((current) => ({ ...current }));
          }}
        />
      ) : null}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  onClose,
  onImagesChanged,
  onSaved,
}: {
  product: CatalogProduct | null;
  categories: CategoryOption[];
  onClose: () => void;
  onImagesChanged: () => void;
  onSaved: (message: string) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>(() => (product ? draftFromProduct(product) : emptyDraft(categories[0]?.id ?? "")));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug" | "category_id" | "price" | "display_order", string>>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if ("name" in patch && !slugTouched) next.slug = slugify(patch.name ?? "");
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setError("");
    const result = await sendProduct(product ? "PATCH" : "POST", product ? `/api/admin/products/${product.id}` : "/api/admin/products", toPayload(draft));
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    let imageError = "";
    const productId = product?.id || result.data.id;
    if (!product && productId) {
      for (const file of pendingFiles) {
        const uploaded = await uploadProductImage(productId, file, draft.name);
        if (!uploaded.ok) {
          imageError = uploaded.error;
          break;
        }
      }
    }
    setPending(false);
    onSaved(imageError ? copy.savedImages : copy.saved);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label={copy.close} className="absolute inset-0 bg-slate-900/30" disabled={pending} onClick={onClose} type="button" />
      <form aria-labelledby={titleId} className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onSubmit={submit} role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {product ? copy.editTitle : copy.createTitle}
            </h2>
            {product ? (
              <p className="mt-1 text-xs text-slate-400">
                {copy.updated} {formatWhen(product.updated_at)}
              </p>
            ) : null}
          </div>
          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.close}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <ProductImages
            alt={draft.name}
            disabled={pending}
            onChange={onImagesChanged}
            onPendingFiles={setPendingFiles}
            pendingFiles={pendingFiles}
            productId={product?.id ?? null}
          />
          <Field error={fieldErrors.name} label={copy.name} required>
            <input autoFocus className={fieldClass} onChange={(event) => update({ name: event.target.value })} required value={draft.name} />
          </Field>
          <Field error={fieldErrors.slug} hint={copy.slugHint} label={copy.slug} required>
            <input
              className={fieldClass}
              onChange={(event) => {
                setSlugTouched(true);
                update({ slug: event.target.value.trim().toLowerCase() });
              }}
              required
              value={draft.slug}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.category_id} label={copy.category} required>
              <select className={fieldClass} onChange={(event) => update({ category_id: event.target.value })} required value={draft.category_id}>
                <option value="">{copy.chooseCategory}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.is_active ? "" : ` (${copy.inactiveCategory})`}
                  </option>
                ))}
              </select>
            </Field>
            <Field error={fieldErrors.display_order} label={copy.order} required>
              <input className={fieldClass} inputMode="numeric" onChange={(event) => update({ display_order: event.target.value })} required value={draft.display_order} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.brand}>
              <input className={fieldClass} onChange={(event) => update({ brand: event.target.value })} value={draft.brand} />
            </Field>
            <Field label={copy.model}>
              <input className={fieldClass} onChange={(event) => update({ model: event.target.value })} value={draft.model} />
            </Field>
          </div>
          <Field label={copy.summary}>
            <input className={fieldClass} onChange={(event) => update({ short_description: event.target.value })} value={draft.short_description} />
          </Field>
          <Field label={copy.description}>
            <textarea className={`${fieldClass} min-h-28 resize-y`} onChange={(event) => update({ description: event.target.value })} value={draft.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.price} hint={copy.priceHint} label={copy.price}>
              <input className={fieldClass} inputMode="decimal" onChange={(event) => update({ price: event.target.value.trim() })} value={draft.price} />
            </Field>
            <Field label={copy.availability}>
              <select className={fieldClass} onChange={(event) => update({ availability: event.target.value })} value={draft.availability}>
                <option value="">{copy.availabilityEmpty}</option>
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
            <Switch checked={draft.price_visible} label={copy.priceVisible} onChange={(checked) => update({ price_visible: checked })} />
            <Switch checked={draft.is_published} label={copy.publish} onChange={(checked) => update({ is_published: checked })} />
            <Switch checked={draft.is_featured} label={copy.feature} onChange={(checked) => update({ is_featured: checked })} />
          </div>
          <details className="rounded-2xl border border-slate-100 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">{copy.more}</summary>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.material}>
                  <input className={fieldClass} onChange={(event) => update({ material: event.target.value })} value={draft.material} />
                </Field>
                <Field label={copy.size}>
                  <input className={fieldClass} onChange={(event) => update({ size: event.target.value })} value={draft.size} />
                </Field>
              </div>
              <Field label={copy.usage}>
                <textarea className={`${fieldClass} min-h-20 resize-y`} onChange={(event) => update({ usage: event.target.value })} value={draft.usage} />
              </Field>
              <Field label={copy.included}>
                <textarea className={`${fieldClass} min-h-20 resize-y`} onChange={(event) => update({ included_components: event.target.value })} value={draft.included_components} />
              </Field>
              <Field label={copy.specifications}>
                <textarea className={`${fieldClass} min-h-24 resize-y`} onChange={(event) => update({ specifications: event.target.value })} value={draft.specifications} />
              </Field>
              <Field label={copy.additional}>
                <textarea className={`${fieldClass} min-h-20 resize-y`} onChange={(event) => update({ additional_information: event.target.value })} value={draft.additional_information} />
              </Field>
            </div>
          </details>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.cancel}
          </button>
          <button className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={pending} type="submit">
            {pending ? copy.saving : copy.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ product, onClose, onDeleted }: { product: CatalogProduct; onClose: () => void; onDeleted: () => void }) {
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    const result = await sendProduct("DELETE", `/api/admin/products/${product.id}`);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label={copy.close} className="absolute inset-0 bg-slate-900/30" disabled={pending} onClick={onClose} type="button" />
      <div aria-labelledby={titleId} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog">
        <h2 className="text-lg font-bold text-slate-900" id={titleId}>
          {copy.confirmDelete}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {product.name}. {copy.confirmDeleteBody}
        </p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.cancel}
          </button>
          <button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={pending} onClick={remove} type="button">
            {pending ? copy.saving : copy.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pager({ data, onPage }: { data: ProductList; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  if (pages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
      <button className="font-semibold text-brand-green-deep disabled:text-slate-300" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} type="button">
        {copy.prev}
      </button>
      <span className="text-xs font-medium text-slate-400">
        {data.page} / {pages}
      </span>
      <button className="font-semibold text-brand-green-deep disabled:text-slate-300" disabled={data.page >= pages} onClick={() => onPage(data.page + 1)} type="button">
        {copy.next}
      </button>
    </div>
  );
}

function Switch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input checked={checked} className="peer sr-only" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-green-deep peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green/40">
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}

function AvailabilityBadge({ value }: { value: string | null }) {
  const label = availabilityLabel(value);
  const tone =
    value === "Available"
      ? "bg-brand-green/15 text-brand-green-deep"
      : value === "Out of Stock"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-rose-600">
              {" "}
              *
            </span>
            <span className="sr-only"> ({copy.requiredMark})</span>
          </>
        ) : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select className={fieldClass} onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{children}</div>;
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30";

async function loadProductList(filters: ProductFilters, signal: AbortSignal) {
  try {
    const response = await fetch(`/api/admin/products?${productListQuery(filters)}`, { signal });
    const payload = (await response.json()) as (ProductList & { error?: string }) | { error?: string };
    if (!response.ok || !payload || !("items" in payload) || !Array.isArray(payload.items)) {
      const message = payload && "error" in payload ? payload.error : "";
      return { ok: false as const, error: message || copy.errors.unavailable };
    }
    return { ok: true as const, data: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    return { ok: false as const, error: copy.errors.unavailable };
  }
}

async function loadCategoryOptions(signal: AbortSignal) {
  try {
    const response = await fetch("/api/admin/categories", { signal });
    const payload = (await response.json()) as CategoryOption[] | { error?: string };
    if (!response.ok || !Array.isArray(payload)) {
      const message = payload && !Array.isArray(payload) ? payload.error : "";
      return { ok: false as const, error: message || copy.errors.unavailable };
    }
    return { ok: true as const, data: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    return { ok: false as const, error: copy.errors.unavailable };
  }
}

function blankFilters(): ProductFilters {
  return { search: "", category: "", availability: "", sort: "featured", page: 1 };
}

function sameFilters(current: ProductFilters, next: ProductFilters) {
  return (
    current.search === next.search &&
    current.category === next.category &&
    current.availability === next.availability &&
    current.sort === next.sort &&
    current.page === next.page
  );
}

function hasFilters(filters: ProductFilters) {
  return Boolean(filters.search || filters.category || filters.availability || filters.sort !== "featured");
}

function rangeStart(data: ProductList) {
  return data.total === 0 ? 0 : (data.page - 1) * data.limit + 1;
}

function rangeEnd(data: ProductList) {
  return Math.min(data.page * data.limit, data.total);
}

function availabilityLabel(value: string | null) {
  if (value === "Available") return copy.availabilityAvailable;
  if (value === "Contact Us") return copy.availabilityContact;
  if (value === "Out of Stock") return copy.availabilityOut;
  return copy.availabilityEmpty;
}

function formatIdr(price: string) {
  const value = Number(price);
  if (!Number.isFinite(value)) return price;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function emptyDraft(categoryId: string): Draft {
  return {
    name: "",
    slug: "",
    category_id: categoryId,
    brand: "",
    model: "",
    short_description: "",
    description: "",
    price: "",
    price_visible: false,
    availability: "",
    is_published: false,
    is_featured: false,
    display_order: "0",
    material: "",
    size: "",
    usage: "",
    included_components: "",
    specifications: "",
    additional_information: "",
  };
}

function draftFromProduct(product: CatalogProduct): Draft {
  return {
    name: product.name,
    slug: product.slug,
    category_id: product.category_id,
    brand: product.brand ?? "",
    model: product.model ?? "",
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    price: product.price ?? "",
    price_visible: product.price_visible,
    availability: product.availability ?? "",
    is_published: product.is_published,
    is_featured: product.is_featured,
    display_order: String(product.display_order),
    material: product.material ?? "",
    size: product.size ?? "",
    usage: product.function ?? "",
    included_components: product.included_components ?? "",
    specifications: product.specifications ?? "",
    additional_information: product.additional_information ?? "",
  };
}

function validate(draft: Draft) {
  const errors: Partial<Record<"name" | "slug" | "category_id" | "price" | "display_order", string>> = {};
  if (!draft.name.trim()) errors.name = copy.errors.name;
  if (!validSlug(draft.slug)) errors.slug = copy.errors.slugFormat;
  if (!draft.category_id) errors.category_id = copy.errors.categoryRequired;
  if (!validPrice(draft.price)) errors.price = copy.errors.price;
  if (!/^\d+$/.test(draft.display_order.trim())) errors.display_order = copy.errors.order;
  return errors;
}

function toPayload(draft: Draft) {
  const text = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  return {
    category_id: draft.category_id,
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    short_description: text(draft.short_description),
    description: text(draft.description),
    brand: text(draft.brand),
    model: text(draft.model),
    material: text(draft.material),
    size: text(draft.size),
    function: text(draft.usage),
    included_components: text(draft.included_components),
    specifications: text(draft.specifications),
    additional_information: text(draft.additional_information),
    price: text(draft.price),
    price_visible: draft.price_visible,
    availability: draft.availability || null,
    is_published: draft.is_published,
    is_featured: draft.is_featured,
    display_order: Number(draft.display_order),
  };
}

async function sendProduct(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) {
  try {
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; id?: string } | null;
    if (!response.ok) return { ok: false as const, error: payload?.error || copy.errors.unavailable };
    return { ok: true as const, data: payload ?? {} };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}
