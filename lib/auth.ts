import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";

// User ids that are always treated as admins, regardless of their stored role.
// Set BETTER_AUTH_ADMIN_USER_IDS to a comma-separated list to bootstrap/guarantee
// access (e.g. the owner) even before any role has been written to the DB.
const adminUserIds = (process.env.BETTER_AUTH_ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

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
  plugins: [
    // Adds roles + user management (list/create/delete users, set role,
    // ban/unban, set password, impersonate). New users default to "user".
    admin({ adminUserIds }),
    // nextCookies() must stay last so it can set cookies for the plugins above.
    nextCookies(),
  ],
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

/**
 * Pure admin check: admin = role "admin" (set via the admin plugin) or listed
 * in BETTER_AUTH_ADMIN_USER_IDS. Use with a session user object.
 */
export function userIsAdmin(user: {
  id: string;
  role?: string | null;
}): boolean {
  return user.role === "admin" || adminUserIds.includes(user.id);
}

/**
 * Returns the current user's id, throwing unless they are an admin.
 * Use to gate admin-only data/actions (mutations and reads).
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized: no signed-in user");
  }
  if (!userIsAdmin(user)) {
    throw new Error("Forbidden: admin access required");
  }
  return user.id;
}

/** Non-throwing admin check for the current request (nav, soft redirects). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ? userIsAdmin(session.user) : false;
}
