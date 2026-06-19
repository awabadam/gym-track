import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Auth screens: reachable without a session; signed-in users get bounced home.
const AUTH_PATHS = ["/sign-in", "/sign-up"];

// Next.js 16: Middleware is now "Proxy". Used here only for optimistic
// cookie-presence redirects — real session validation happens in the data
// layer via requireUserId().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  // "/" is public: it serves the marketing landing page when signed out and the
  // dashboard when signed in (the page itself branches on session).
  const isPublic = isAuthPage || pathname === "/";
  const sessionCookie = getSessionCookie(request);

  // Signed-out user hitting a protected route → send to sign-in.
  if (!sessionCookie && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  // Signed-in user hitting an auth screen → send to the dashboard.
  if (sessionCookie && isAuthPage) {
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
