"use client";

// import { authClient } from "@/lib/auth-client";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const handleSignIn = async () => {
    const redirectUri = `https://discord.com/oauth2/authorize?client_id=1397412199869186090&response_type=code&redirect_uri=https%3A%2F%2Fticketbot.pro%2Fapi%2Fauth%2Fcallback%2Fdiscord&scope=identify+email+guilds`;
    window.location.href = redirectUri;
  };
  // : "http://localhost:3000/api/auth/callback/discord"
  // );
  // const scope = encodeURIComponent("identify email guilds");

  // const state =
  //   Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // if (typeof window !== "undefined") {
  //   sessionStorage.setItem("oauth_state", state);
  // }

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
