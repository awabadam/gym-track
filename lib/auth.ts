import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  // Email + password is enabled out of the box (no external provider needed).
  // To add "Continue with Google" later, drop a socialProviders.google block
  // here with GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
  emailAndPassword: {
    enabled: true,
  },
  // Lets sign-in/sign-up server actions set the session cookie.
  plugins: [nextCookies()],
});

/**
 * Returns the current user's id, throwing if there is no signed-in user.
 * Routes are gated by middleware, so a user is normally always present — this
 * is the single source of truth that every data/action function scopes to.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized: no signed-in user");
  }
  return session.user.id;
}
