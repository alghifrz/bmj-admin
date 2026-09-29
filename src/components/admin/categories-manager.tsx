"use client";

import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { ProductPhoto } from "@/components/admin/product-images";
import content from "@/data/content.json";
import { slugify, validSlug, type CatalogCategory, type LoadResult } from "@/lib/catalog";

const copy = content.categories;
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30";

type Draft = {
  name: string;
  slug: string;
  description: string;
  display_order: string;
  is_active: boolean;
};

export function CategoriesManager({ initialQuery = "" }: { initialQuery?: string }) {
  const [items, setItems] = useState<CatalogCategory[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<CatalogCategory | "new" | null>(null);
  const [removing, setRemoving] = useState<CatalogCategory | null>(null);
  const [movingId, setMovingId] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void loadCategoryList(controller.signal).then((result) => {
      if (controller.signal.aborted || !result) return;
      if (result.ok) {
        setItems(result.data);
        setLoadError("");
        return;
      }
      setLoadError(result.error);
    });
    return () => controller.abort();
  }, [reloadKey]);

  const list = items ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) => `${item.name} ${item.slug} ${item.description ?? ""}`.toLowerCase().includes(needle));
  }, [list, query]);

  function reload() {
    setReloadKey((current) => current + 1);
  }

  function patchItem(id: string, patch: Partial<CatalogCategory>) {
    setItems((current) => current?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ?? current);
  }

  async function toggle(item: CatalogCategory, isActive: boolean) {
    patchItem(item.id, { is_active: isActive });
    const result = await sendCategory("PATCH", `/api/admin/categories/${item.id}`, { is_active: isActive });
    if (!result.ok) {
      patchItem(item.id, { is_active: item.is_active });
      setNotice(result.error);
    }
  }

  async function move(item: CatalogCategory, direction: -1 | 1) {
    if (!items) return;
    const index = items.findIndex((entry) => entry.id === item.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= items.length) return;
    const previous = items;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved);
    setItems(reordered.map((entry, order) => ({ ...entry, display_order: order })));
    setMovingId(item.id);
    setNotice("");
    for (const [order, entry] of reordered.entries()) {
      if (entry.display_order === order) continue;
      const result = await sendCategory("PATCH", `/api/admin/categories/${entry.id}`, { display_order: order });
      if (!result.ok) {
        setItems(previous);
        setNotice(result.error);
        setMovingId("");
        return;
      }
    }
    setMovingId("");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        <button
          className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
          onClick={() => {
            setNotice("");
            setEditor("new");
          }}
          type="button"
        >
          {copy.add}
        </button>
      </header>

      {notice ? <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{notice}</p> : null}

      <section className="dashboard-card rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
        <label className="block max-w-sm">
          <span className="sr-only">{copy.searchPlaceholder}</span>
          <input className={fieldClass} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} value={query} />
        </label>

        {items === null ? (
          <div className="mt-6 space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : loadError && items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-600">{loadError}</p>
            <button className="mt-4 text-sm font-semibold text-brand-green-deep" onClick={reload} type="button">
              {copy.retry}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-slate-800">{query.trim() ? copy.noMatch : copy.emptyTitle}</p>
            {query.trim() ? null : <p className="mt-1 text-sm text-slate-500">{copy.emptyBody}</p>}
            {query.trim() ? (
              <button className="mt-4 text-sm font-semibold text-brand-green-deep" onClick={() => setQuery("")} type="button">
                {copy.reset}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs font-medium text-slate-400">
              {visible.length} {copy.count}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-200 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] tracking-wider text-slate-400 uppercase">
                    <th className="px-3 py-3 font-semibold">{copy.name}</th>
                    <th className="px-3 py-3 font-semibold">{copy.order}</th>
                    <th className="px-3 py-3 font-semibold">{copy.publish}</th>
                    <th className="px-3 py-3 font-semibold">{copy.edit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((item) => {
                    const index = list.findIndex((entry) => entry.id === item.id);
                    return (
                      <tr className="transition-colors hover:bg-slate-50" key={item.id}>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <ProductPhoto alt="" className="h-12 w-12" src={item.image_url} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">{item.name}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-400">{item.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <button className="text-slate-500 disabled:opacity-30" disabled={Boolean(movingId) || index <= 0} onClick={() => void move(item, -1)} type="button">
                              {copy.moveEarlier}
                            </button>
                            <span className="text-slate-700">{item.display_order}</span>
                            <button className="text-slate-500 disabled:opacity-30" disabled={Boolean(movingId) || index === list.length - 1} onClick={() => void move(item, 1)} type="button">
                              {copy.moveLater}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <Switch checked={item.is_active} label={item.is_active ? copy.active : copy.inactive} onChange={(checked) => void toggle(item, checked)} />
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <button className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-green-deep hover:bg-brand-green/10" onClick={() => setEditor(item)} type="button">
                              {copy.edit}
                            </button>
                            <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={() => setRemoving(item)} type="button">
                              {copy.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {editor ? (
        <CategoryEditor
          category={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onImage={(url) => {
            if (editor && editor !== "new") patchItem(editor.id, { image_url: url });
          }}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            reload();
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDelete
          category={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            setNotice(copy.deleted);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CategoryEditor({
  category,
  onClose,
  onImage,
  onSaved,
}: {
  category: CatalogCategory | null;
  onClose: () => void;
  onImage: (url: string | null) => void;
  onSaved: (message: string) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>(() => (category ? draftFromCategory(category) : emptyDraft()));
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [imageURL, setImageURL] = useState(category?.image_url ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug" | "display_order", string>>>({});
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

  async function chooseImage(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError(content.products.errors.imageSize);
      return;
    }
    if (file.type && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError(content.products.errors.imageType);
      return;
    }
    if (!category) {
      setPendingFile(file);
      return;
    }
    setPending(true);
    const uploaded = await uploadCategoryImage(category.id, file);
    setPending(false);
    if (!uploaded.ok) {
      setError(uploaded.error);
      return;
    }
    setImageURL(uploaded.imageURL);
    onImage(uploaded.imageURL);
  }

  async function removeImage() {
    if (!category) {
      setPendingFile(null);
      return;
    }
    setPending(true);
    setError("");
    const result = await sendCategory("DELETE", `/api/admin/categories/${category.id}/image`);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setImageURL(null);
    onImage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setError("");
    const result = await sendCategory(category ? "PATCH" : "POST", category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || null,
      display_order: Number(draft.display_order),
      is_active: draft.is_active,
    });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    let imageError = "";
    const categoryId = category?.id || result.data.id;
    if (!category && pendingFile && categoryId) {
      const uploaded = await uploadCategoryImage(categoryId, pendingFile);
      if (!uploaded.ok) imageError = uploaded.error;
    }
    setPending(false);
    onSaved(imageError ? copy.savedImage : copy.saved);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label={copy.close} className="absolute inset-0 bg-slate-900/30" disabled={pending} onClick={onClose} type="button" />
      <form aria-labelledby={titleId} className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onSubmit={submit} role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {category ? copy.editTitle : copy.createTitle}
            </h2>
            {category ? (
              <p className="mt-1 text-xs text-slate-400">
                {copy.updated} {formatWhen(category.updated_at)}
              </p>
            ) : null}
          </div>
          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.close}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <ImageField disabled={pending} file={pendingFile} imageURL={imageURL} onRemove={() => void removeImage()} onSelect={(file) => void chooseImage(file)} />
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
          <Field label={copy.description}>
            <textarea className={`${fieldClass} min-h-28 resize-y`} onChange={(event) => update({ description: event.target.value })} value={draft.description} />
          </Field>
          <Field error={fieldErrors.display_order} label={copy.order} required>
            <input className={fieldClass} inputMode="numeric" onChange={(event) => update({ display_order: event.target.value })} required value={draft.display_order} />
          </Field>
          <div className="rounded-2xl bg-slate-50 p-4">
            <Switch checked={draft.is_active} label={copy.publish} onChange={(checked) => update({ is_active: checked })} />
          </div>
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

function ImageField({
  imageURL,
  file,
  disabled,
  onSelect,
  onRemove,
}: {
  imageURL: string | null;
  file: File | null;
  disabled: boolean;
  onSelect: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const src = preview || imageURL;
  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{copy.image}</h3>
      <p className="mt-1 text-xs text-slate-400">{copy.imageHint}</p>
      <div className="mt-3 flex items-center gap-3">
        <ProductPhoto alt="" src={src} />
        <div className="flex flex-col items-start gap-2">
          <label className={`rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-200"}`}>
            {src ? copy.replaceImage : copy.addImage}
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                onSelect(event.target.files?.[0]);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
          {src ? (
            <button className="text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={disabled} onClick={onRemove} type="button">
              {copy.removeImage}
            </button>
          ) : null}
        </div>
      </div>
      {file ? <p className="mt-3 text-xs text-slate-400">{copy.imagePending}</p> : null}
    </section>
  );
}

function ConfirmDelete({ category, onClose, onDeleted }: { category: CatalogCategory; onClose: () => void; onDeleted: () => void }) {
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    const result = await sendCategory("DELETE", `/api/admin/categories/${category.id}`);
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
          {category.name}. {copy.confirmDeleteBody}
        </p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.cancel}
          </button>
          <button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={pending} onClick={() => void remove()} type="button">
            {pending ? copy.saving : copy.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }) {
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

function emptyDraft(): Draft {
  return { name: "", slug: "", description: "", display_order: "0", is_active: false };
}

function draftFromCategory(category: CatalogCategory): Draft {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    display_order: String(category.display_order),
    is_active: category.is_active,
  };
}

function validate(draft: Draft) {
  const errors: Partial<Record<"name" | "slug" | "display_order", string>> = {};
  if (!draft.name.trim()) errors.name = copy.errors.name;
  if (!validSlug(draft.slug)) errors.slug = copy.errors.slugFormat;
  if (!/^\d+$/.test(draft.display_order.trim())) errors.display_order = copy.errors.order;
  return errors;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

async function loadCategoryList(signal: AbortSignal): Promise<LoadResult<CatalogCategory[]> | null> {
  try {
    const response = await fetch("/api/admin/categories", { signal });
    const payload = (await response.json()) as CatalogCategory[] | { error?: string };
    if (!response.ok || !Array.isArray(payload)) {
      const message = payload && !Array.isArray(payload) ? payload.error : "";
      return { ok: false, error: message || copy.errors.unavailable };
    }
    return { ok: true, data: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    return { ok: false, error: copy.errors.unavailable };
  }
}

async function uploadCategoryImage(categoryId: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch(`/api/admin/categories/${categoryId}/image`, { method: "POST", body });
    const payload = (await response.json().catch(() => null)) as { error?: string; image_url?: string | null } | null;
    if (!response.ok || !payload || typeof payload.image_url !== "string") {
      return { ok: false as const, error: payload?.error || copy.errors.unavailable };
    }
    return { ok: true as const, imageURL: payload.image_url };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}

async function sendCategory(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) {
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
