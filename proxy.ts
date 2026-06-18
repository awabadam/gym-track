import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Auth screens are the only routes reachable without a session.
const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

// Next.js 16: Middleware is now "Proxy". Used here only for optimistic
// cookie-presence redirects — real session validation happens in the data
// layer via requireUserId().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionCookie = getSessionCookie(request);

  // Signed-out user hitting an app route → send to sign-in.
  if (!sessionCookie && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  // Signed-in user hitting an auth screen → send to the dashboard.
  if (sessionCookie && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals, the auth API, and static files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
