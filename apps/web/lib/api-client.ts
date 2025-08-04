import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";

const getApiUrl = () => {
  // When running on the server side in the same container, use internal URL
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  // Client-side: use relative URL for API calls (same host)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && baseDomain) {
    return `https://api.${baseDomain}`;
  }

  return "http://localhost:3001";
};

export const createApiClient = () => {
  const baseUrl = getApiUrl();
  return hc<AppType>(baseUrl, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }),
  });
};

export const api = createApiClient();

export const createAuthenticatedClient = (cookieHeader: string) => {
  const baseUrl = getApiUrl();

  const customFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", cookieHeader);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    return fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });
  };

  return hc<AppType>(baseUrl, { fetch: customFetch });
};
