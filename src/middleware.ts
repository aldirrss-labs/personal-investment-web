import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  // Gate nonaktif kalau APP_PASSWORD belum di-set (mis. dev lokal tanpa proteksi).
  if (!expected) return NextResponse.next();

  if (request.nextUrl.pathname === "/login") return NextResponse.next();

  const session = request.cookies.get("app_auth")?.value;
  if (session === expected) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
