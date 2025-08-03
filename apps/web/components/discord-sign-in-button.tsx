"use client";

import { authClient } from "@/lib/auth-client";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: typeof window !== "undefined" ? `${window.location.origin}/guilds` : undefined,
    });
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
