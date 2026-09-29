import { NextResponse } from "next/server";

import content from "@/data/content.json";
import { proxyAdminForm, proxyAdminRead } from "@/lib/admin-proxy";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: content.products.errors.missing }, { status: 404 });
  }
  return proxyAdminRead(`/api/v1/admin/products/${id}/images`);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: content.products.errors.missing }, { status: 404 });
  }
  return proxyAdminForm(request, `/api/v1/admin/products/${id}/images`);
}
