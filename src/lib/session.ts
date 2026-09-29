import "server-only";

import { cookies } from "next/headers";

import { apiRequest, readBody, type AdminProfile, type SuccessBody } from "@/lib/api";

export const sessionCookie = "bmj_admin_token";
const sessionMaxAge = 60 * 60 * 12;

export function sessionCookieOptions(remember = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: sessionMaxAge } : {}),
  };
}

export async function readSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  return token?.trim() ? token : undefined;
}

export async function getCurrentAdmin() {
  const token = await readSessionToken();
  if (!token) {
    return null;
  }

  let response: Response;
  try {
    response = await apiRequest("/api/v1/admin/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const body = await readBody<SuccessBody<AdminProfile>>(response);
  if (!body?.data?.id || !body.data.email) {
    return null;
  }

  return body.data;
}
