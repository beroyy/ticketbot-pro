import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";

const getApiUrl = () => {
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
        mode: "cors" as RequestMode,
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
      headers,
    });
  };

  return hc<AppType>(baseUrl, { fetch: customFetch });
};
