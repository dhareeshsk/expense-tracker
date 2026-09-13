import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    req.auth.user?.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/households/:path*",
    "/reminders/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
