import { NextResponse } from "next/server";

import content from "@/data/content.json";
import { apiRequest, errorCode, readBody, type SuccessBody } from "@/lib/api";
import { sessionCookie, sessionCookieOptions } from "@/lib/session";

type LoginData = {
  token: string;
  admin: {
    id: string;
    name: string;
    email: string;
  };
};

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: content.login.errors.invalid,
  INVALID_REQUEST: content.login.errors.invalid,
  ACCOUNT_INACTIVE: content.login.errors.inactive,
};

function messageFor(code: string | undefined) {
  if (code && messages[code]) {
    return messages[code];
  }
  return content.login.errors.unavailable;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: content.login.errors.required }, { status: 400 });
  }

  const email =
    payload && typeof payload === "object" && "email" in payload
      ? String(payload.email).trim()
      : "";
  const password =
    payload && typeof payload === "object" && "password" in payload
      ? String(payload.password)
      : "";
  const remember =
    payload &&
    typeof payload === "object" &&
    "remember" in payload &&
    payload.remember === false
      ? false
      : true;

  if (!email || !password) {
    return NextResponse.json({ error: content.login.errors.required }, { status: 400 });
  }

  let response: Response;
  try {
    response = await apiRequest("/api/v1/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ error: content.login.errors.unavailable }, { status: 503 });
  }

  const body = await readBody<SuccessBody<LoginData>>(response);
  if (!response.ok || !body?.data?.token) {
    const status = response.status === 401 || response.status === 403 ? response.status : 502;
    return NextResponse.json({ error: messageFor(errorCode(body)) }, { status });
  }

  const result = NextResponse.json({
    admin: {
      id: body.data.admin.id,
      name: body.data.admin.name,
      email: body.data.admin.email,
    },
  });
  result.cookies.set(sessionCookie, body.data.token, sessionCookieOptions(remember));
  return result;
}
