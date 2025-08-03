"use client";

// import { authClient } from "@/lib/auth-client";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const handleSignIn = async () => {
    // Custom OAuth URL construction to work around better-auth scope encoding bug
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1397412199869186090";
    const redirectUri = encodeURIComponent(
      process.env.NODE_ENV === "production"
        ? "https://www.ticketbot.pro/api/auth/callback/discord"
        : "http://localhost:3000/api/auth/callback/discord"
    );
    const scope = encodeURIComponent("identify email guilds");

    const state =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_state", state);
    }

    window.location.href = `https://discord.com/api/v9/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&integration_type=0`;
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
