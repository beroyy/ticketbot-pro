import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "@/lib/auth-server";
import { authClient } from "@/lib/auth-client";

/**
 * Login Page
 * Server component that redirects if already authenticated
 */
export default async function LoginPage() {
  // Check if already logged in
  const session = await getServerSession();
  
  if (session) {
    // Already authenticated, redirect to guilds
    redirect("/guilds");
  }
  
  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      <Image
        src="/blurred-lp-bg.png"
        alt="Background"
        width={1440}
        height={900}
        priority
        className="absolute inset-0 h-full w-full object-cover"
      />
      
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-6 text-center">
          <Image
            src="/shiny-icon.png"
            alt="TicketsBot"
            width={70}
            height={70}
            className="rounded-full"
          />
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to TicketsBot
            </h1>
            <p className="text-gray-600">
              Sign in with Discord to manage your support tickets
            </p>
          </div>
          
          <DiscordSignInButton />
        </div>
      </div>
    </div>
  );
}

/**
 * Discord Sign In Button
 * Client component for OAuth flow
 */
function DiscordSignInButton() {
  "use client";
  
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "/guilds",
    });
  };
  
  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4752C4]"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
      Sign in with Discord
    </button>
  );
}