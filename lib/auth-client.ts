import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// baseURL is omitted intentionally — the client and server share the same
// origin, so Better Auth derives it from the current location.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
