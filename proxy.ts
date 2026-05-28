import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAuthPage = nextUrl.pathname.startsWith("/login");
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();
  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
    return NextResponse.next();
  }
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
