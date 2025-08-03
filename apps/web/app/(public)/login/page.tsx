import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "@/lib/auth-server";
import { DiscordSignInButton } from "@/components/discord-sign-in-button";

export const dynamic = "force-dynamic";

/**
 * Login Page
 * Server component that redirects if already authenticated
 */
export default async function LoginPage() {
  // Check if already logged in
  // const session = await getServerSession();

  // if (session) {
  //   redirect("/guilds");
  // }

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
            <h1 className="text-3xl font-bold tracking-tight">Welcome to TicketsBot</h1>
            <p className="text-gray-600">Sign in with Discord to manage your support tickets</p>
          </div>

          <DiscordSignInButton />
        </div>
      </div>
    </div>
  );
}
