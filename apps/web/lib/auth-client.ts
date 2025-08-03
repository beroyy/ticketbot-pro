import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "",
  basePath: "/api/auth",
  fetch: {
    credentials: "include",
  },
});

export const useSession = authClient.useSession;
