import { logger } from "./utils/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { prisma } from "../prisma";
import { User as UserDomain, Account as AccountDomain } from "../domains";
import { getDiscordAvatarUrl } from "./services/discord-api";
import { getWebUrl, getApiUrl, isProduction } from "../utils";
import type { User, Session } from "./types";

type AuthContext = {
  newSession?: {
    user: User;
    session: Session;
  };
  user?: User;
};

type SessionData = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
};

const getOrigins = () => {
  const webOrigin = getWebUrl();
  const apiOrigin = getApiUrl();

  if (!getOrigins.logged) {
    logger.info("Auth trusted origins:", {
      webOrigin,
      apiOrigin,
      baseDomain: process.env.BASE_DOMAIN || "localhost",
    });
    getOrigins.logged = true;
  }

  return { webOrigin, apiOrigin };
};
getOrigins.logged = false;

// No longer using Redis for secondary storage - database only

const createAuthInstance = () => {
  const getEnvVar = (key: string, fallback?: string): string => {
    return process.env[key] || fallback || "";
  };

  const authSecret = getEnvVar("BETTER_AUTH_SECRET");
  if (!authSecret) {
    logger.error("BETTER_AUTH_SECRET is not set! Sessions will not work properly.");
  }

  const discordClientId = getEnvVar("DISCORD_CLIENT_ID");
  const discordClientSecret = getEnvVar("DISCORD_CLIENT_SECRET");

  if (!discordClientId || !discordClientSecret) {
    logger.warn("Discord OAuth credentials not set. OAuth login will not work.", {
      clientIdSet: !!discordClientId,
      clientSecretSet: !!discordClientSecret,
    });
  }

  const { webOrigin, apiOrigin } = getOrigins();
  const cookieDomain = isProduction() ? `.${process.env.BASE_DOMAIN}` : "localhost";

  logger.debug("Creating Better Auth instance", {
    baseURL: webOrigin,
    basePath: "/api/auth",
    discordConfigured: !!discordClientId && !!discordClientSecret,
    discordClientId: discordClientId?.substring(0, 6) + "...",
    nodeEnv: process.env["NODE_ENV"],
    cookieDomain,
  });

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: authSecret,
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 300, // 5 minutes cache
      },
      expiresIn: 60 * 60 * 24 * 7,
    },
    trustedOrigins: [webOrigin, apiOrigin],
    advanced: {
      cookiePrefix: "ticketsbot",
      useSecureCookies: isProduction(),
      disableCSRFCheck: !isProduction(),
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["discord"],
      },
    },
    socialProviders: {
      discord: {
        clientId: discordClientId,
        clientSecret: discordClientSecret,
        redirectURI: `${webOrigin}/api/auth/callback/discord`,
        scope: ["identify+email+guilds"],
        mapProfileToUser: (profile: any) => {
          logger.debug("Discord OAuth profile received:", {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            hasAvatar: !!profile.avatar,
          });
          return {
            name: profile.username,
          };
        },
      },
    },
    user: {
      additionalFields: {
        discordUserId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },
    plugins: [
      customSession(async (sessionData: SessionData) => {
        const { user, session } = sessionData;

        // Quick path: If user already has Discord data and it's fresh, return immediately
        const existingUser = user as any;
        if (
          existingUser.discordUserId &&
          existingUser.username &&
          existingUser.discordDataFetchedAt
        ) {
          const dataAge = Date.now() - new Date(existingUser.discordDataFetchedAt).getTime();
          const MAX_AGE = 30 * 60 * 1000; // 30 minutes

          if (dataAge < MAX_AGE) {
            logger.debug("Using cached Discord data from session", {
              userId: user.id,
              discordUserId: existingUser.discordUserId,
              dataAge: Math.round(dataAge / 1000) + "s",
            });
            return { session, user };
          }
        }

        // Slow path: Fetch Discord data if missing or stale
        logger.debug("customSession slow path triggered", {
          userId: user.id,
          hasDiscordUserId: !!existingUser.discordUserId,
          hasUsername: !!existingUser.username,
        });

        const fullUser = await UserDomain.getBetterAuthUser(user.id);
        logger.debug("Fetched full user from DB", {
          userId: user.id,
          hasDiscordUserId: !!fullUser?.discordUserId,
          discordUserId: fullUser?.discordUserId,
        });

        let discordUser = null;
        if (fullUser?.discordUserId) {
          discordUser = await UserDomain.getDiscordUser(fullUser.discordUserId);
          logger.debug("Fetched Discord user", {
            discordUserId: fullUser.discordUserId,
            username: discordUser?.username,
          });
        }

        if (!fullUser) {
          logger.warn("No full user found in DB", { userId: user.id });
          return { session, user };
        }

        let discordUserId = fullUser.discordUserId;

        // Only do the account lookup if we don't have a Discord ID
        if (!discordUserId) {
          logger.debug("No Discord ID on user, checking OAuth accounts", { userId: user.id });
          const discordAccount = await AccountDomain.getDiscordAccount(user.id);
          logger.debug("Discord OAuth account lookup result", {
            userId: user.id,
            found: !!discordAccount,
            accountId: discordAccount?.accountId,
          });

          if (discordAccount?.accountId) {
            discordUserId = discordAccount.accountId;

            await UserDomain.ensure(
              discordAccount.accountId,
              `User_${discordAccount.accountId.slice(-6)}`,
              undefined,
              undefined,
              { source: "customSession" }
            );

            await UserDomain.updateDiscordUserId(user.id, discordAccount.accountId);
            logger.info("Updated user with Discord ID from OAuth account", {
              userId: user.id,
              discordUserId: discordAccount.accountId,
            });

            discordUser = await UserDomain.getDiscordUser(discordAccount.accountId);
          }
        }

        const enhancedUser = {
          ...user,
          discordUserId: discordUserId ?? null,
          username: discordUser?.username ?? null,
          discriminator: discordUser?.discriminator ?? null,
          avatar_url: discordUser?.avatarUrl ?? null,
        };

        logger.debug("customSession returning enhanced user", {
          userId: user.id,
          hasDiscordUserId: !!enhancedUser.discordUserId,
          discordUserId: enhancedUser.discordUserId,
          username: enhancedUser.username,
        });

        return {
          session,
          user: enhancedUser,
        };
      }),
    ],
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        logger.debug("Auth Hook - Path:", ctx.path);

        if (ctx.path && ctx.path.includes("/sign-in/social")) {
          logger.info("OAuth sign-in request detected", {
            path: ctx.path,
            method: ctx.method,
          });
        }

        if (ctx.path && ctx.path.includes("/callback/")) {
          logger.debug("OAuth callback detected", { path: ctx.path });

          const contextData = ctx.context as AuthContext;
          const user = contextData?.newSession?.user || contextData?.user;

          if (!user) {
            logger.debug("No user found in context after Discord callback");
            return;
          }

          logger.debug("User found after Discord callback:", user.id);

          try {
            const account = await AccountDomain.getDiscordAccount(user.id);

            logger.debug("Discord account found:", account?.accountId);

            if (!account?.accountId || !account.accessToken) {
              logger.debug("No account or access token found");
              return;
            }

            // First, fetch Discord user info to ensure we have the data
            const discordUserResponse = await fetch("https://discord.com/api/v10/users/@me", {
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
                "User-Agent": "ticketsbot.ai (https://github.com/ticketsbot/ticketsbot, 1.0.0)",
              },
            });

            if (discordUserResponse.ok) {
              const discordProfile = (await discordUserResponse.json()) as {
                id: string;
                username: string;
                discriminator: string | null;
                avatar: string | null;
              };

              // Calculate avatar URL
              const avatarUrl = getDiscordAvatarUrl(
                discordProfile.id,
                discordProfile.avatar,
                discordProfile.discriminator || "0"
              );

              // Ensure DiscordUser exists first
              await UserDomain.ensure(
                account.accountId,
                discordProfile.username,
                discordProfile.discriminator || undefined,
                avatarUrl
              );

              logger.debug("Ensured DiscordUser exists", {
                discordId: account.accountId,
                username: discordProfile.username,
              });
            }

            // Now update the Better Auth user with the Discord link
            await prisma.user.update({
              where: { id: user.id },
              data: {
                discordUserId: account.accountId,
              },
            });

            logger.debug("Linked Discord account to user");

            // Force session refresh by invalidating cache
            // This ensures the customSession plugin re-runs on next request
            try {
              // Clear any cached session data to force refresh
              logger.info("Forcing session refresh after Discord link");
            } catch (e) {
              logger.error("Failed to clear session cache:", e);
            }

            try {
              logger.debug("Fetching user guilds to cache...");

              const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                headers: {
                  Authorization: `Bearer ${account.accessToken}`,
                  "User-Agent": "ticketsbot.ai (https://github.com/ticketsbot/ticketsbot, 1.0.0)",
                },
              });

              if (guildsResponse.ok) {
                const guilds = (await guildsResponse.json()) as Array<{
                  id: string;
                  name: string;
                  icon?: string | null;
                  owner?: boolean;
                  permissions?: string;
                  features?: string[];
                }>;

                // Mark which guilds user can administrate
                const MANAGE_GUILD = BigInt(0x20);

                const guildsWithAdminStatus = guilds.map((guild) => ({
                  id: guild.id,
                  name: guild.name,
                  icon: guild.icon,
                  owner: guild.owner || false,
                  permissions: guild.permissions || "0",
                  features: guild.features || [],
                  isAdmin:
                    guild.owner ||
                    (guild.permissions
                      ? (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD
                      : false),
                }));

                // Cache all guilds in DiscordUser
                await prisma.discordUser.update({
                  where: { id: account.accountId },
                  data: {
                    guilds: {
                      data: guildsWithAdminStatus,
                      fetchedAt: new Date().toISOString(),
                    },
                  },
                });

                logger.debug(`Cached ${guilds.length} guilds for user during OAuth`, {
                  totalGuilds: guilds.length,
                  adminGuilds: guildsWithAdminStatus.filter((g) => g.isAdmin).length,
                  discordUserId: account.accountId,
                });

                // Only set up ownership and roles for guilds where bot is installed
                const guildModule = await import("../domains/guild");
                const findGuildById = guildModule.findById;
                const ensureGuild = guildModule.ensure;
                const roleModule = await import("../domains/role");
                const Role = roleModule.Role;

                const adminGuilds = guildsWithAdminStatus.filter((g) => g.isAdmin);

                for (const guild of adminGuilds) {
                  try {
                    // Check if bot is in this guild
                    const dbGuild = await findGuildById(guild.id);

                    if (dbGuild?.botInstalled) {
                      logger.debug(
                        `Bot is installed in guild ${guild.id}, setting up ownership and roles`
                      );

                      // Update ownership if they own it
                      if (guild.owner && dbGuild.ownerDiscordId !== account.accountId) {
                        await ensureGuild(guild.id, guild.name, account.accountId);
                        logger.debug(`Updated ownership for guild ${guild.id}`);
                      }

                      // Ensure default roles exist
                      await Role.ensureDefaultRoles(guild.id);

                      // Assign appropriate role
                      if (guild.owner) {
                        const adminRole = await Role.getRoleByName(guild.id, "admin");
                        if (adminRole) {
                          await Role.assignRole(adminRole.id, account.accountId);
                          logger.info(`Assigned admin role to guild owner in guild ${guild.id}`);
                        }
                      } else {
                        const viewerRole = await Role.getRoleByName(guild.id, "viewer");
                        if (viewerRole) {
                          await Role.assignRole(viewerRole.id, account.accountId);
                          logger.info(`Assigned viewer role to admin user in guild ${guild.id}`);
                        }
                      }
                    }
                  } catch (error) {
                    logger.error(`Failed to setup guild ${guild.id}:`, error);
                  }
                }
              } else {
                logger.warn("Failed to fetch user guilds during auth:", guildsResponse.status);
              }
            } catch (error) {
              logger.error("Error caching guilds during auth:", error);
            }
          } catch (error) {
            logger.error("Error linking Discord account:", error);
          }
        }
      }),
    },
  });
};

export { getSessionFromContext } from "./services/session";

export const auth = createAuthInstance();
