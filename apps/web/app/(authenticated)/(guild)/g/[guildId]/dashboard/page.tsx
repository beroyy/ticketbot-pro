import { getServerSession } from "@/lib/auth-server";
import { getGuildWithAccess } from "@/lib/guild-context";
import { WithPermission } from "@/components/guards";

export default async function DashboardPage({
  params,
}: {
  params: { guildId: string };
}) {
  const session = await getServerSession();
  const guild = await getGuildWithAccess(session!.user.discordUserId!, params.guildId);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {guild?.name || "Guild Dashboard"}
        </h2>
        <p className="text-gray-600">
          Guild ID: {params.guildId}
        </p>
        
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <WithPermission permission="TICKET_VIEW_ALL" guildId={params.guildId}>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900">Open Tickets</h3>
              <p className="text-2xl font-bold text-blue-600">-</p>
            </div>
          </WithPermission>
          
          <WithPermission permission="ANALYTICS_VIEW" guildId={params.guildId}>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900">Resolved Today</h3>
              <p className="text-2xl font-bold text-green-600">-</p>
            </div>
          </WithPermission>
          
          <WithPermission permission="ANALYTICS_VIEW" guildId={params.guildId}>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-medium text-purple-900">Avg Response Time</h3>
              <p className="text-2xl font-bold text-purple-600">-</p>
            </div>
          </WithPermission>
        </div>
        
        <WithPermission 
          permission="GUILD_SETTINGS_EDIT" 
          guildId={params.guildId}
          fallback={
            <p className="mt-4 text-sm text-gray-500">
              You need edit permissions to manage guild settings.
            </p>
          }
        >
          <div className="mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Manage Settings
            </button>
          </div>
        </WithPermission>
      </div>
    </div>
  );
}