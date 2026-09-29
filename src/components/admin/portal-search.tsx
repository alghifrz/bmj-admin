"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import content from "@/data/content.json";
import { productPageHref, type CatalogProduct, type ProductList } from "@/lib/catalog";

const copy = content.dashboard;

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type CatalogReview = {
  id: string;
  customer_name: string;
  customer_role_or_organization: string | null;
  review_text: string;
  is_published: boolean;
};

type Hit = {
  id: string;
  group: string;
  title: string;
  detail: string;
  status: string;
  href: string;
};

export function PortalSearch() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);

  const trimmed = query.trim();
  const activeHit = hits[active] ?? null;

  useEffect(() => {
    if (trimmed.length === 0) {
      setHits([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchCatalog(trimmed, controller.signal).then((next) => {
        if (controller.signal.aborted || !next) return;
        setHits(next);
        setActive(0);
        setLoading(false);
      });
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const node = inputRef.current;
      if (!node) return;
      setBox(node.getBoundingClientRect());
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, trimmed, hits.length]);

  const groups = useMemo(() => {
    const order = [copy.searchProducts, copy.searchCategories, copy.searchReviews];
    return order
      .map((label) => ({ label, items: hits.filter((hit) => hit.group === label) }))
      .filter((group) => group.items.length > 0);
  }, [hits]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inputRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-portal-search]")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || trimmed.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (hits.length === 0 ? 0 : (current + 1) % hits.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (hits.length === 0 ? 0 : (current - 1 + hits.length) % hits.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeHit) go(activeHit.href);
      else go(productPageHref({ search: trimmed, category: "", availability: "", sort: "featured", page: 1 }));
    }
  }

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <input
        aria-activedescendant={activeHit ? `${listId}-${activeHit.id}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && trimmed.length > 0}
        aria-label={copy.searchLabel}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 py-2 pr-4 pl-10 text-xs text-slate-700 placeholder:text-slate-400 transition-all focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30 focus:outline-none sm:text-sm"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={copy.searchPlaceholder}
        ref={inputRef}
        role="combobox"
        type="search"
        value={query}
      />
      {open && trimmed.length > 0 && box ? (
        <SearchPanel
          activeId={activeHit ? `${listId}-${activeHit.id}` : ""}
          box={box}
          groups={groups}
          listId={listId}
          loading={loading}
          onHover={setActive}
          onSelect={go}
          query={trimmed}
        />
      ) : null}
    </div>
  );
}

function SearchPanel({
  box,
  groups,
  listId,
  activeId,
  loading,
  query,
  onHover,
  onSelect,
}: {
  box: DOMRect;
  groups: { label: string; items: Hit[] }[];
  listId: string;
  activeId: string;
  loading: boolean;
  query: string;
  onHover: (index: number) => void;
  onSelect: (href: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const width = Math.min(Math.max(box.width, 360), window.innerWidth - 24);
  const left = Math.min(Math.max(12, box.left), window.innerWidth - width - 12);
  let index = 0;

  return createPortal(
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
      data-portal-search=""
      style={{ position: "fixed", top: box.bottom + 8, left, width, zIndex: 40 }}
    >
      <div className="max-h-96 overflow-y-auto p-2" id={listId} role="listbox">
        {groups.length === 0 && !loading ? <p className="px-3 py-6 text-center text-sm text-slate-500">{copy.searchEmpty}</p> : null}
        {groups.map((group) => (
          <div className="mb-1" key={group.label}>
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{group.label}</p>
            {group.items.map((hit) => {
              const itemIndex = index;
              index += 1;
              const selected = `${listId}-${hit.id}` === activeId;
              return (
                <button
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${selected ? "bg-slate-50" : "hover:bg-slate-50"}`}
                  id={`${listId}-${hit.id}`}
                  key={hit.id}
                  onClick={() => onSelect(hit.href)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => onHover(itemIndex)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{hit.title}</span>
                    <span className="block truncate text-xs text-slate-400">{hit.detail}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{hit.status}</span>
                </button>
              );
            })}
          </div>
        ))}
        {loading ? <p className="px-3 py-2 text-xs text-slate-400">{copy.searchLoading}</p> : null}
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button
          className="text-xs font-semibold text-brand-green-deep"
          onClick={() => onSelect(productPageHref({ search: query, category: "", availability: "", sort: "featured", page: 1 }))}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          {copy.searchViewProducts}
        </button>
      </div>
    </div>,
    document.body,
  );
}

async function searchCatalog(query: string, signal: AbortSignal): Promise<Hit[] | null> {
  try {
    const [products, categories, reviews] = await Promise.all([
      fetch(`/api/admin/products?search=${encodeURIComponent(query)}&page=1&limit=5`, { signal }),
      fetch("/api/admin/categories", { signal }),
      fetch("/api/admin/reviews", { signal }),
    ]);
    if (signal.aborted) return null;

    const productBody = (await products.json().catch(() => null)) as (ProductList & { error?: string }) | null;
    const categoryBody = (await categories.json().catch(() => null)) as CatalogCategory[] | { error?: string } | null;
    const reviewBody = (await reviews.json().catch(() => null)) as CatalogReview[] | { error?: string } | null;

    const productHits = products.ok && productBody && "items" in productBody && Array.isArray(productBody.items) ? productBody.items.map(productHit) : [];
    const categoryHits = categories.ok && Array.isArray(categoryBody) ? categoryBody.filter((item) => matches(query, item.name, item.slug, item.description)).slice(0, 5).map(categoryHit) : [];
    const reviewHits = reviews.ok && Array.isArray(reviewBody) ? reviewBody.filter((item) => matches(query, item.customer_name, item.customer_role_or_organization, item.review_text)).slice(0, 5).map(reviewHit) : [];

    return [...productHits, ...categoryHits, ...reviewHits];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    return [];
  }
}

function productHit(item: CatalogProduct): Hit {
  const detail = [item.category?.name, item.brand, item.model].filter(Boolean).join(" · ");
  return {
    id: `product-${item.id}`,
    group: copy.searchProducts,
    title: item.name,
    detail: detail || item.slug,
    status: item.is_published ? copy.searchPublished : copy.searchDraft,
    href: productPageHref({ search: item.name, category: "", availability: "", sort: "featured", page: 1 }),
  };
}

function categoryHit(item: CatalogCategory): Hit {
  return {
    id: `category-${item.id}`,
    group: copy.searchCategories,
    title: item.name,
    detail: item.slug,
    status: item.is_active ? copy.searchActive : copy.searchInactive,
    href: `/kategori?search=${encodeURIComponent(item.name)}`,
  };
}

function reviewHit(item: CatalogReview): Hit {
  return {
    id: `review-${item.id}`,
    group: copy.searchReviews,
    title: item.customer_name,
    detail: item.customer_role_or_organization || item.review_text,
    status: item.is_published ? copy.searchPublished : copy.searchDraft,
    href: `/ulasan?search=${encodeURIComponent(item.customer_name)}`,
  };
}

function matches(query: string, ...parts: Array<string | null | undefined>) {
  const needle = query.toLowerCase();
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
}
