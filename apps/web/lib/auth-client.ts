import { createAuthClient } from "better-auth/react";

const getApiUrl = () => {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && baseDomain) {
    return `https://api.${baseDomain}`;
  }

  return "http://localhost:3001";
};

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  basePath: "/auth",
  fetch: {
    credentials: "include",
    mode: "cors" as RequestMode,
  },
});

export const useSession = authClient.useSession;
