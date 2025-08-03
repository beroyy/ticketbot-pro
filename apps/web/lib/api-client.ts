import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";

export const createApiClient = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";
  return hc<AppType>(baseUrl);
};

export const api = createApiClient();

export const createAuthenticatedClient = (cookieHeader: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";

  const customFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", cookieHeader);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  return hc<AppType>(baseUrl, { fetch: customFetch });
};
