"use client";

import { useState } from "react";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);

      // Call our server endpoint to generate OAuth URL
      const response = await fetch("/api/auth/discord/signin", {
        method: "POST",
        credentials: "same-origin", // Ensure cookies are included
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callbackURL: "/guilds",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate OAuth flow");
      }

      const { url } = await response.json();

      // Redirect to the OAuth URL
      window.location.href = url;
    } catch (error) {
      console.error("OAuth error:", error);
      // TODO: Show error to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FaDiscord className="size-5" />
      {isLoading ? "Redirecting..." : "Sign in with Discord"}
    </button>
  );
}
