"use client";

import { useEffect, useState } from "react";

import content from "@/data/content.json";

const copy = content.products;
const maxImages = 8;
const maxBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ProductImage = {
  id: string;
  image_url: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
};

export function ProductImages({
  productId,
  alt,
  pendingFiles,
  onPendingFiles,
  onChange,
  disabled,
}: {
  productId: string | null;
  alt: string;
  pendingFiles: File[];
  onPendingFiles: (files: File[]) => void;
  onChange: () => void;
  disabled: boolean;
}) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productId) {
      setImages([]);
      return;
    }
    let ignore = false;
    void loadImages(productId).then((result) => {
      if (ignore) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setImages(result.images);
    });
    return () => {
      ignore = true;
    };
  }, [productId]);

  const count = images.length + pendingFiles.length;

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError("");
    const incoming = [...list];
    const room = maxImages - count;
    if (room <= 0) {
      setError(copy.errors.imageLimit);
      return;
    }
    const accepted: File[] = [];
    for (const file of incoming.slice(0, room)) {
      if (file.size > maxBytes) {
        setError(copy.errors.imageSize);
        continue;
      }
      if (file.type && !allowedTypes.has(file.type)) {
        setError(copy.errors.imageType);
        continue;
      }
      accepted.push(file);
    }
    if (incoming.length > room) setError(copy.errors.imageLimit);
    if (!productId) {
      onPendingFiles([...pendingFiles, ...accepted]);
      return;
    }
    setBusy(true);
    for (const file of accepted) {
      const uploaded = await uploadProductImage(productId, file, alt);
      if (!uploaded.ok) {
        setError(uploaded.error);
        break;
      }
    }
    const refreshed = await loadImages(productId);
    setBusy(false);
    if (refreshed.ok) setImages(refreshed.images);
    onChange();
  }

  async function saveImage(image: ProductImage, patch: { alt_text?: string; display_order?: number; is_primary?: boolean }) {
    if (!productId) return;
    setBusy(true);
    setError("");
    const result = await sendImage("PATCH", `/api/admin/products/${productId}/images/${image.id}`, patch);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const refreshed = await loadImages(productId);
    if (refreshed.ok) setImages(refreshed.images);
    onChange();
  }

  async function removeImage(image: ProductImage) {
    if (!productId) return;
    setBusy(true);
    setError("");
    const result = await sendImage("DELETE", `/api/admin/products/${productId}/images/${image.id}`);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const refreshed = await loadImages(productId);
    if (refreshed.ok) setImages(refreshed.images);
    onChange();
  }

  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (!productId || next < 0 || next >= images.length) return;
    const reordered = [...images];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    setBusy(true);
    setError("");
    for (const [order, image] of reordered.entries()) {
      if (image.display_order === order) continue;
      const result = await sendImage("PATCH", `/api/admin/products/${productId}/images/${image.id}`, { display_order: order });
      if (!result.ok) {
        setError(result.error);
        break;
      }
    }
    const refreshed = await loadImages(productId);
    setBusy(false);
    if (refreshed.ok) setImages(refreshed.images);
    onChange();
  }

  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{copy.images}</h3>
          <p className="mt-1 text-xs text-slate-400">{copy.imagesHint}</p>
        </div>
        <label className={`rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ${disabled || busy || count >= maxImages ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-200"}`}>
          {copy.addImages}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || busy || count >= maxImages}
            multiple
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      {images.length === 0 && pendingFiles.length === 0 ? null : (
        <ul className="mt-4 flex flex-col gap-3">
          {images.map((image, index) => (
            <li className="flex gap-3 rounded-xl bg-slate-50 p-3" key={image.id}>
              <ProductPhoto alt={image.alt_text || alt} src={image.image_url} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {image.is_primary ? <span className="rounded-full bg-brand-green-deep px-2 py-0.5 text-[10px] font-semibold text-white">{copy.primary}</span> : null}
                  <button className="text-[11px] font-semibold text-slate-500 disabled:opacity-40" disabled={disabled || busy || index === 0} onClick={() => void move(index, -1)} type="button">
                    {copy.moveEarlier}
                  </button>
                  <button className="text-[11px] font-semibold text-slate-500 disabled:opacity-40" disabled={disabled || busy || index === images.length - 1} onClick={() => void move(index, 1)} type="button">
                    {copy.moveLater}
                  </button>
                </div>
                <label className="mt-2 block">
                  <span className="text-[11px] font-medium text-slate-400">{copy.imageAlt}</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-green-deep"
                    defaultValue={image.alt_text}
                    disabled={disabled || busy}
                    key={`${image.id}-${image.alt_text}`}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next !== image.alt_text) void saveImage(image, { alt_text: next });
                    }}
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  {image.is_primary ? null : (
                    <button className="text-xs font-semibold text-brand-green-deep disabled:opacity-50" disabled={disabled || busy} onClick={() => void saveImage(image, { is_primary: true })} type="button">
                      {copy.makePrimary}
                    </button>
                  )}
                  <button className="text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={disabled || busy} onClick={() => void removeImage(image)} type="button">
                    {copy.removeImage}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {pendingFiles.map((file, index) => (
            <PendingFile
              file={file}
              key={`${file.name}-${file.lastModified}-${index}`}
              onRemove={() => onPendingFiles(pendingFiles.filter((_, fileIndex) => fileIndex !== index))}
            />
          ))}
        </ul>
      )}
      {pendingFiles.length > 0 ? <p className="mt-3 text-xs text-slate-400">{copy.imagesPending}</p> : null}
    </section>
  );
}

function PendingFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <li className="flex gap-3 rounded-xl bg-slate-50 p-3">
      <ProductPhoto alt={file.name} src={src || null} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
        <button className="mt-2 text-xs font-semibold text-rose-600" onClick={onRemove} type="button">
          {copy.removeImage}
        </button>
      </div>
    </li>
  );
}

export function ProductPhoto({ src, alt, className = "h-16 w-16" }: { src: string | null; alt: string; className?: string }) {
  const preview = src ? resizedSrc(src) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src) {
    return <span className={`flex ${className} shrink-0 items-center justify-center rounded-xl bg-white text-xs text-slate-300 ring-1 ring-slate-100`}>—</span>;
  }

  return (
    // Storage hosts vary, and a pending file is still a local blob URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={`${className} shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-100`}
      decoding="async"
      loading="lazy"
      onError={() => {
        if (preview && !failed) setFailed(true);
      }}
      src={preview && !failed ? preview : src}
    />
  );
}

function resizedSrc(src: string) {
  if (src.startsWith("blob:") || src.startsWith("data:")) return null;
  const marker = "/storage/v1/object/public/";
  const index = src.indexOf(marker);
  if (index < 0) return null;
  const path = src.slice(index + marker.length).split(/[?#]/)[0];
  if (!path) return null;
  return `${src.slice(0, index)}/storage/v1/render/image/public/${path}?width=192&height=192&resize=cover&quality=70`;
}

export async function uploadProductImage(productId: string, file: File, alt: string) {
  const body = new FormData();
  body.set("file", file);
  if (alt.trim()) body.set("alt_text", alt.trim());
  return sendImage("POST", `/api/admin/products/${productId}/images`, body);
}

async function loadImages(productId: string) {
  try {
    const response = await fetch(`/api/admin/products/${productId}/images`);
    const payload = (await response.json().catch(() => null)) as ProductImage[] | { error?: string } | null;
    if (!response.ok || !Array.isArray(payload)) {
      const error = payload && !Array.isArray(payload) ? payload.error : "";
      return { ok: false as const, error: error || copy.errors.unavailable };
    }
    return { ok: true as const, images: payload };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}

async function sendImage(method: "POST" | "PATCH" | "DELETE", path: string, body?: FormData | Record<string, unknown>) {
  try {
    const response = await fetch(path, {
      method,
      headers: body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return { ok: false as const, error: payload?.error || copy.errors.unavailable };
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}
