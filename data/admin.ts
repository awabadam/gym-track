import { headers } from "next/headers";
import { auth, requireAdmin } from "@/lib/auth";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
};

/**
 * Lists users for the admin console. Reads run through the admin plugin so its
 * authorization (caller must be an admin) is enforced server-side; we also call
 * requireAdmin() up front to fail fast / get the current admin id.
 */
export async function listUsersForAdmin(opts: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ users: AdminUser[]; total: number; currentUserId: string }> {
  const currentUserId = await requireAdmin();

  const res = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: opts.limit,
      offset: opts.offset,
      sortBy: "createdAt",
      sortDirection: "desc",
      ...(opts.search
        ? {
            searchField: "email" as const,
            searchOperator: "contains" as const,
            searchValue: opts.search,
          }
        : {}),
    },
  });

  return {
    users: res.users as AdminUser[],
    total: typeof res.total === "number" ? res.total : res.users.length,
    currentUserId,
  };
}
