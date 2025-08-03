import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001",
  basePath: "/auth",
});

export const useSession = authClient.useSession;
