"use client";

import { authClient } from "@/lib/auth-client";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const handleSignIn = async () => {
    // Use better-auth's method to ensure proper state management
    // but intercept the redirect to fix the URL encoding issue

    // Store the original window.location.assign method
    const originalAssign = window.location.assign;
    const originalHref = Object.getOwnPropertyDescriptor(window.location, "href");

    // Override to fix the URL before redirect
    window.location.assign = function (url) {
      // Fix the malformed scope parameter
      const fixedUrl = url.toString().replace(/scope=([^&]+)/, (match: string, scopes: string) => {
        // If scopes contain unencoded spaces, fix them
        if (scopes.includes(" ")) {
          return "scope=" + scopes.replace(/ /g, "+");
        }
        return match;
      });

      console.log("Original URL:", url);
      console.log("Fixed URL:", fixedUrl);

      // Restore original method and redirect
      window.location.assign = originalAssign;
      originalAssign.call(window.location, fixedUrl);
    };

    // Also override href setter
    Object.defineProperty(window.location, "href", {
      set: function (url) {
        const fixedUrl = url
          .toString()
          .replace(/scope=([^&]+)/, (match: string, scopes: string) => {
            if (scopes.includes(" ")) {
              return "scope=" + scopes.replace(/ /g, "+");
            }
            return match;
          });

        console.log("Original href:", url);
        console.log("Fixed href:", fixedUrl);

        // Restore original property and set
        Object.defineProperty(window.location, "href", originalHref!);
        window.location.href = fixedUrl;
      },
      get: originalHref!.get,
      configurable: true,
    });

    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/guilds",
      });
    } finally {
      // Restore original methods in case the promise rejects
      window.location.assign = originalAssign;
      Object.defineProperty(window.location, "href", originalHref!);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4752C4]"
    >
      <FaDiscord className="size-5" />
      Sign in with Discord
    </button>
  );
}
