import { NextResponse } from "next/server";

import content from "@/data/content.json";
import { proxyAdminWrite } from "@/lib/admin-proxy";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: content.products.errors.missing }, { status: 404 });
  }
  return proxyAdminWrite(request, `/api/v1/admin/products/${id}`);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: content.products.errors.missing }, { status: 404 });
  }
  return proxyAdminWrite(request, `/api/v1/admin/products/${id}`);
}
