import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession, getUserWithGuilds } from "@/lib/auth-server";
import { checkBotInstalled, setSelectedGuild, getSelectedGuild } from "@/lib/guild-context";
import { GuildListClient } from "./guild-list-client";

export const dynamic = "force-dynamic";

export default async function GuildsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const userData = await getUserWithGuilds(session.user.id);
  if (!userData) {
    return <div>Failed to load user data</div>;
  }

  const guildsWithStatus = await Promise.all(
    userData.guilds.map(async (guild: any) => ({
      ...guild,
      botInstalled: await checkBotInstalled(guild.id),
    }))
  );

  const selectedGuild = await getSelectedGuild();

  if (selectedGuild && !params.error) {
    const guild = guildsWithStatus.find((g: any) => g.id === selectedGuild && g.botInstalled);
    if (guild) {
      redirect(`/g/${selectedGuild}/dashboard`);
    }
  }

  const guildsWithBot = guildsWithStatus.filter((g: any) => g.botInstalled);
  const guildsWithoutBot = guildsWithStatus.filter((g: any) => !g.botInstalled);

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Select a Server</h1>
            <p className="mt-2 text-gray-600">Choose a server to manage with TicketsBot</p>
          </div>

          {params.error === "no-access" && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
              You don't have access to that server. Please select a different one.
            </div>
          )}

          {guildsWithBot.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">Servers with TicketsBot</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {guildsWithBot.map((guild: any) => (
                  <GuildCard key={guild.id} guild={guild} hasBot={true} />
                ))}
              </div>
            </div>
          )}

          {guildsWithoutBot.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Available Servers</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {guildsWithoutBot.map((guild: any) => (
                  <GuildCard key={guild.id} guild={guild} hasBot={false} />
                ))}
              </div>
            </div>
          )}

          {guildsWithStatus.length === 0 && (
            <div className="text-center">
              <p className="text-gray-600">You don't have any Discord servers. Create one first!</p>
            </div>
          )}
        </div>
      </div>

      <GuildListClient />
    </>
  );
}

function GuildCard({
  guild,
  hasBot,
}: {
  guild: {
    id: string;
    name: string;
    icon?: string | null;
    owner?: boolean;
    isAdmin?: boolean;
  };
  hasBot: boolean;
}) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {iconUrl ? (
          <Image src={iconUrl} alt={guild.name} width={64} height={64} className="rounded-full" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
            <span className="text-2xl font-bold text-gray-600">{guild.name[0]}</span>
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold">{guild.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            {guild.owner && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700">Owner</span>
            )}
            {!guild.owner && guild.isAdmin && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">Admin</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {hasBot ? (
          <form action={setSelectedGuild.bind(null, guild.id)}>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Select Server
            </button>
          </form>
        ) : (
          <a
            href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1397414095753318522"}&permissions=1099780064336&scope=bot+applications.commands&guild_id=${guild.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-gray-100 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Install Bot
          </a>
        )}
      </div>
    </div>
  );
}
