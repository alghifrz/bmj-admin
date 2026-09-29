import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionCookie, sessionCookieOptions } from "@/lib/session";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, "", { ...sessionCookieOptions(), maxAge: 0 });
  return NextResponse.redirect(new URL("/login", request.url));
}
