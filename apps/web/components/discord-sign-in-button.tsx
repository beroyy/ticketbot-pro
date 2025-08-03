"use client";

import { authClient } from "@/lib/auth-client";
import { FaDiscord } from "react-icons/fa6";

export function DiscordSignInButton() {
  const handleSignIn = async () => {
    // Store the original navigation method
    const originalAssign = window.location.assign;
    
    // Override window.location.assign to fix URL encoding
    window.location.assign = function(url: string) {
      // Fix the scope parameter encoding
      const fixedUrl = url.replace(/scope=([^&]+)/, (match, scopes) => {
        // Check if spaces are already encoded
        if (!scopes.includes('%20')) {
          return 'scope=' + scopes.replace(/ /g, '%20');
        }
        return match;
      });
      
      console.log('OAuth URL fixed:', { original: url, fixed: fixedUrl });
      
      // Restore original method and navigate
      window.location.assign = originalAssign;
      originalAssign.call(window.location, fixedUrl);
    };

    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/guilds",
      });
    } catch (error) {
      // Restore original method in case of error
      window.location.assign = originalAssign;
      console.error("OAuth error:", error);
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
