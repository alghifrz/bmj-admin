import "server-only";

import { NextResponse } from "next/server";

import content from "@/data/content.json";
import { apiRequest, errorCode, readBody } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const copy = content.products.errors;

export async function proxyAdminWrite(request: Request, path: string) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: copy.unauthorized }, { status: 401 });
  }

  const method = request.method.toUpperCase();
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const init: RequestInit = { method, headers };

  if (method !== "DELETE") {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: copy.invalid }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: copy.invalid }, { status: 400 });
    }
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(payload);
  }

  let response: Response;
  try {
    response = await apiRequest(path, init);
  } catch {
    return NextResponse.json({ error: copy.unavailable }, { status: 503 });
  }

  const body = await readBody<{ data?: unknown; error?: { code?: string } }>(response);
  if (!response.ok || !body || !("data" in body)) {
    return NextResponse.json({ error: messageFor(errorCode(body)) }, { status: passthroughStatus(response.status) });
  }

  return NextResponse.json(body.data, { status: response.status === 201 ? 201 : 200 });
}

export async function proxyAdminRead(path: string) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: copy.unauthorized }, { status: 401 });
  }

  let response: Response;
  try {
    response = await apiRequest(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return NextResponse.json({ error: copy.unavailable }, { status: 503 });
  }

  const body = await readBody<{ data?: unknown; error?: { code?: string } }>(response);
  if (!response.ok || !body || !("data" in body)) {
    return NextResponse.json({ error: messageFor(errorCode(body)) }, { status: passthroughStatus(response.status) });
  }
  return NextResponse.json(body.data);
}

export async function proxyAdminForm(request: Request, path: string) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: copy.unauthorized }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: copy.imageType }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: copy.imageType }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: copy.imageSize }, { status: 400 });
  }
  if (file.type && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return NextResponse.json({ error: copy.imageType }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.set("file", file);
  const alt = form.get("alt_text");
  if (typeof alt === "string") outbound.set("alt_text", alt.slice(0, 200));

  let response: Response;
  try {
    response = await apiRequest(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outbound,
    });
  } catch {
    return NextResponse.json({ error: copy.unavailable }, { status: 503 });
  }

  const body = await readBody<{ data?: unknown; error?: { code?: string } }>(response);
  if (!response.ok || !body || !("data" in body)) {
    return NextResponse.json({ error: messageFor(errorCode(body)) }, { status: passthroughStatus(response.status) });
  }
  return NextResponse.json(body.data, { status: response.status === 201 ? 201 : 200 });
}

function passthroughStatus(status: number) {
  if (status === 400 || status === 401 || status === 404 || status === 409 || status === 503) return status;
  return 502;
}

function messageFor(code: string | undefined) {
  if (code === "SLUG_ALREADY_EXISTS") return copy.slug;
  if (code === "CATEGORY_NOT_FOUND") return copy.category;
  if (code === "CATEGORY_IN_USE") return content.categories.errors.inUse;
  if (code === "PRODUCT_NOT_FOUND") return copy.missing;
  if (code === "REVIEW_NOT_FOUND") return content.reviews.errors.missing;
  if (code === "LOCATION_NOT_FOUND") return content.store.errors.missing;
  if (code === "IMAGE_NOT_FOUND") return copy.imageMissing;
  if (code === "IMAGE_TYPE") return copy.imageType;
  if (code === "IMAGE_TOO_LARGE") return copy.imageSize;
  if (code === "IMAGE_LIMIT") return copy.imageLimit;
  if (code === "STORAGE_UNAVAILABLE") return copy.storage;
  if (code === "INVALID_REQUEST" || code === "ALREADY_EXISTS") return copy.invalid;
  return copy.unavailable;
}
