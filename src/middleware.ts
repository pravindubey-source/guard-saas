import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "guard_saas_session";
const PUBLIC_API = ["/api/auth/login", "/api/setup"];

async function isValidToken(token: string | undefined) {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidToken(token);

  // Protect API routes (except login)
  if (pathname.startsWith("/api/") && !PUBLIC_API.includes(pathname)) {
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protect dashboard pages
  const protectedPrefixes = ["/dashboard", "/societies", "/guards", "/assignments", "/attendance", "/billing"];
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    if (!valid) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && valid) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/societies/:path*",
    "/guards/:path*",
    "/assignments/:path*",
    "/attendance/:path*",
    "/billing/:path*",
    "/login",
    "/api/:path*",
  ],
};
