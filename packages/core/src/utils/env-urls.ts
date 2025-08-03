function getBaseDomain(): string {
  const baseDomain = process.env.BASE_DOMAIN;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !baseDomain) {
    throw new Error("BASE_DOMAIN is required in production environment");
  }

  return baseDomain || "localhost";
}

export function getWebUrl(): string {
  const baseDomain = getBaseDomain();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return `https://app.${baseDomain}`;
  }

  return `http://localhost:${DEV_PORTS.web}`;
}

export function getApiUrl(): string {
  const baseDomain = getBaseDomain();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return `https://api.${baseDomain}`;
  }

  return `http://localhost:${DEV_PORTS.api}`;
}

// export function getCookieDomain(): string {
//   const baseDomain = getBaseDomain();
//   const isProduction = process.env.NODE_ENV === "production";

//   if (isProduction) {
//     return `.${baseDomain}`;
//   }

//   return "localhost";
// }

export function getDiscordRedirectUri(): string {
  return `${getApiUrl()}/auth/callback/discord`;
}

export function getAllUrls() {
  return {
    baseDomain: getBaseDomain(),
    webUrl: getWebUrl(),
    apiUrl: getApiUrl(),
    discordRedirectUri: getDiscordRedirectUri(),
  };
}

const DEV_PORTS = {
  web: 3000,
  api: 3001,
  bot: 3002,
} as const;

export function getDevPorts() {
  return DEV_PORTS;
}
