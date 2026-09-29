"use client";

import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { ProductPhoto } from "@/components/admin/product-images";
import content from "@/data/content.json";
import type { LoadResult } from "@/lib/catalog";

const copy = content.reviews;
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30";

type CatalogReview = {
  id: string;
  customer_name: string;
  customer_role_or_organization: string | null;
  review_text: string;
  rating: number | null;
  customer_image: string | null;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type Draft = {
  customer_name: string;
  role: string;
  review_text: string;
  rating: string;
  display_order: string;
  is_published: boolean;
  is_featured: boolean;
};

export function ReviewsManager({ initialQuery = "" }: { initialQuery?: string }) {
  const [items, setItems] = useState<CatalogReview[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<CatalogReview | "new" | null>(null);
  const [removing, setRemoving] = useState<CatalogReview | null>(null);
  const [movingId, setMovingId] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void loadReviewList(controller.signal).then((result) => {
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
    return list.filter((item) =>
      `${item.customer_name} ${item.customer_role_or_organization ?? ""} ${item.review_text}`.toLowerCase().includes(needle),
    );
  }, [list, query]);

  function reload() {
    setReloadKey((current) => current + 1);
  }

  function patchItem(id: string, patch: Partial<CatalogReview>) {
    setItems((current) => current?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ?? current);
  }

  async function toggle(item: CatalogReview, patch: { is_published?: boolean; is_featured?: boolean }) {
    patchItem(item.id, patch);
    const result = await sendReview("PATCH", `/api/admin/reviews/${item.id}`, patch);
    if (!result.ok) {
      patchItem(item.id, { is_published: item.is_published, is_featured: item.is_featured });
      setNotice(result.error);
    }
  }

  async function move(item: CatalogReview, direction: -1 | 1) {
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
      const result = await sendReview("PATCH", `/api/admin/reviews/${entry.id}`, { display_order: order });
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
              <table className="w-full min-w-240 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] tracking-wider text-slate-400 uppercase">
                    <th className="px-3 py-3 font-semibold">{copy.name}</th>
                    <th className="px-3 py-3 font-semibold">{copy.text}</th>
                    <th className="px-3 py-3 font-semibold">{copy.rating}</th>
                    <th className="px-3 py-3 font-semibold">{copy.order}</th>
                    <th className="px-3 py-3 font-semibold">{copy.publish}</th>
                    <th className="px-3 py-3 font-semibold">{copy.edit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((item) => {
                    const index = list.findIndex((entry) => entry.id === item.id);
                    return (
                      <tr className="align-middle transition-colors hover:bg-slate-50" key={item.id}>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <ProductPhoto alt="" className="h-12 w-12" src={item.customer_image} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">{item.customer_name}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-400">{item.customer_role_or_organization || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-xs px-3 py-4 text-slate-600">
                          <p className="line-clamp-2">{item.review_text}</p>
                        </td>
                        <td className="px-3 py-4">
                          <Stars value={item.rating} />
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <button className="text-slate-500 disabled:opacity-30" disabled={Boolean(movingId) || index <= 0} onClick={() => void move(item, -1)} type="button">
                              {copy.moveEarlier}
                            </button>
                            <span className="text-slate-700">{item.display_order}</span>
                            <button
                              className="text-slate-500 disabled:opacity-30"
                              disabled={Boolean(movingId) || index === list.length - 1}
                              onClick={() => void move(item, 1)}
                              type="button"
                            >
                              {copy.moveLater}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-col gap-2">
                            <Switch
                              checked={item.is_published}
                              label={item.is_published ? copy.published : copy.draft}
                              onChange={(checked) => void toggle(item, { is_published: checked })}
                            />
                            <Switch checked={item.is_featured} label={copy.featured} onChange={(checked) => void toggle(item, { is_featured: checked })} />
                          </div>
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
        <ReviewEditor
          onClose={() => setEditor(null)}
          onImage={(url) => {
            if (editor !== "new") patchItem(editor.id, { customer_image: url });
          }}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            reload();
          }}
          review={editor === "new" ? null : editor}
        />
      ) : null}

      {removing ? (
        <ConfirmDelete
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            setNotice(copy.deleted);
            reload();
          }}
          review={removing}
        />
      ) : null}
    </div>
  );
}

function ReviewEditor({
  review,
  onClose,
  onImage,
  onSaved,
}: {
  review: CatalogReview | null;
  onClose: () => void;
  onImage: (url: string | null) => void;
  onSaved: (message: string) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>(() => (review ? draftFromReview(review) : emptyDraft()));
  const [imageURL, setImageURL] = useState(review?.customer_image ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"customer_name" | "review_text" | "rating" | "display_order", string>>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
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
    if (!review) {
      setPendingFile(file);
      return;
    }
    setPending(true);
    const uploaded = await uploadReviewImage(review.id, file);
    setPending(false);
    if (!uploaded.ok) {
      setError(uploaded.error);
      return;
    }
    setImageURL(uploaded.imageURL);
    onImage(uploaded.imageURL);
  }

  async function removeImage() {
    if (!review) {
      setPendingFile(null);
      return;
    }
    setPending(true);
    setError("");
    const result = await sendReview("DELETE", `/api/admin/reviews/${review.id}/photo`);
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
    const payload = reviewBody(draft);
    const result = await sendReview(review ? "PATCH" : "POST", review ? `/api/admin/reviews/${review.id}` : "/api/admin/reviews", payload);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    let imageError = "";
    const reviewId = review?.id || result.data.id;
    if (!review && pendingFile && reviewId) {
      const uploaded = await uploadReviewImage(reviewId, pendingFile);
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
              {review ? copy.editTitle : copy.createTitle}
            </h2>
            {review ? (
              <p className="mt-1 text-xs text-slate-400">
                {copy.updated} {formatWhen(review.updated_at)}
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
          <Field error={fieldErrors.customer_name} label={copy.name} required>
            <input autoFocus className={fieldClass} onChange={(event) => update({ customer_name: event.target.value })} required value={draft.customer_name} />
          </Field>
          <Field label={copy.role}>
            <input className={fieldClass} onChange={(event) => update({ role: event.target.value })} value={draft.role} />
          </Field>
          <Field error={fieldErrors.review_text} label={copy.text} required>
            <textarea className={`${fieldClass} min-h-28 resize-y`} onChange={(event) => update({ review_text: event.target.value })} required value={draft.review_text} />
          </Field>
          <Field error={fieldErrors.rating} label={copy.rating}>
            <RatingInput onChange={(rating) => update({ rating })} value={draft.rating} />
          </Field>
          <Field error={fieldErrors.display_order} label={copy.order} required>
            <input className={fieldClass} inputMode="numeric" onChange={(event) => update({ display_order: event.target.value })} required value={draft.display_order} />
          </Field>
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
            <Switch checked={draft.is_published} label={copy.publish} onChange={(checked) => update({ is_published: checked })} />
            <Switch checked={draft.is_featured} label={copy.feature} onChange={(checked) => update({ is_featured: checked })} />
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

function ConfirmDelete({ review, onClose, onDeleted }: { review: CatalogReview; onClose: () => void; onDeleted: () => void }) {
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    const result = await sendReview("DELETE", `/api/admin/reviews/${review.id}`);
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
          {review.customer_name}. {copy.confirmDeleteBody}
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

function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-slate-400">{copy.ratingEmpty}</span>;
  return (
    <span aria-label={`${value} ${copy.stars}`} className="tracking-wide text-brand-green-deep">
      {"★".repeat(value)}
      <span className="text-slate-200">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function RatingInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = Number(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-label={`${star} ${copy.stars}`}
            className={`px-1 text-xl leading-none ${selected >= star ? "text-brand-green-deep" : "text-slate-300"}`}
            key={star}
            onClick={() => onChange(value === String(star) ? "" : String(star))}
            type="button"
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-400">{selected >= 1 && selected <= 5 ? `${selected} ${copy.stars}` : copy.ratingEmpty}</span>
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
  return { customer_name: "", role: "", review_text: "", rating: "", display_order: "0", is_published: false, is_featured: false };
}

function draftFromReview(review: CatalogReview): Draft {
  return {
    customer_name: review.customer_name,
    role: review.customer_role_or_organization ?? "",
    review_text: review.review_text,
    rating: review.rating ? String(review.rating) : "",
    display_order: String(review.display_order),
    is_published: review.is_published,
    is_featured: review.is_featured,
  };
}

function validate(draft: Draft) {
  const errors: Partial<Record<"customer_name" | "review_text" | "rating" | "display_order", string>> = {};
  if (!draft.customer_name.trim()) errors.customer_name = copy.errors.name;
  if (!draft.review_text.trim()) errors.review_text = copy.errors.text;
  if (draft.rating && !["1", "2", "3", "4", "5"].includes(draft.rating)) errors.rating = copy.errors.rating;
  if (!/^\d+$/.test(draft.display_order.trim())) errors.display_order = copy.errors.order;
  return errors;
}

function reviewBody(draft: Draft) {
  return {
    customer_name: draft.customer_name.trim(),
    customer_role_or_organization: draft.role.trim() || null,
    review_text: draft.review_text.trim(),
    rating: draft.rating ? Number(draft.rating) : null,
    display_order: Number(draft.display_order),
    is_published: draft.is_published,
    is_featured: draft.is_featured,
  };
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

async function loadReviewList(signal: AbortSignal): Promise<LoadResult<CatalogReview[]> | null> {
  try {
    const response = await fetch("/api/admin/reviews", { signal });
    const payload = (await response.json()) as CatalogReview[] | { error?: string };
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

async function uploadReviewImage(reviewId: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}/photo`, { method: "POST", body });
    const payload = (await response.json().catch(() => null)) as { error?: string; customer_image?: string | null } | null;
    if (!response.ok || !payload || typeof payload.customer_image !== "string") {
      return { ok: false as const, error: payload?.error || copy.errors.unavailable };
    }
    return { ok: true as const, imageURL: payload.customer_image };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}

async function sendReview(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) {
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
