import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const sessionCookie = "bmj_admin_token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!token) {
    if (isLogin) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
