import { NextResponse } from "next/server";

import content from "@/data/content.json";
import { apiRequest, errorCode, readBody } from "@/lib/api";
import { readSessionToken, sessionCookie, sessionCookieOptions } from "@/lib/session";

const copy = content.account.errors;

type AccountData = {
  token?: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
};

const messages: Record<string, string> = {
  INVALID_REQUEST: copy.invalid,
  INVALID_PASSWORD: copy.password,
  CURRENT_PASSWORD: copy.current,
  CURRENT_PASSWORD_REQUIRED: copy.currentRequired,
  EMAIL_TAKEN: copy.taken,
};

export async function PATCH(request: Request) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: copy.unavailable }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: copy.invalid }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: copy.invalid }, { status: 400 });
  }

  let response: Response;
  try {
    response = await apiRequest("/api/v1/admin/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json({ error: copy.unavailable }, { status: 503 });
  }

  const body = await readBody<{ data?: AccountData; error?: { code?: string } }>(response);
  const admin = body?.data?.admin;
  if (!response.ok || !admin?.id || !body?.data?.token) {
    const status = response.status === 400 || response.status === 401 || response.status === 409 ? response.status : 502;
    return NextResponse.json({ error: messages[errorCode(body) ?? ""] ?? copy.unavailable }, { status });
  }

  const result = NextResponse.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
  });
  result.cookies.set(sessionCookie, body.data.token, sessionCookieOptions(true));
  return result;
}
