import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiRequest } from "@/lib/api";
import { readSessionToken, sessionCookie, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const token = await readSessionToken();
  if (token) {
    try {
      await apiRequest("/api/v1/admin/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // The local session is cleared even when the API cannot be reached.
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, "", { ...sessionCookieOptions(), maxAge: 0 });

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
