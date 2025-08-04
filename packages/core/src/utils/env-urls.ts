function getBaseDomain(): string {
  const baseDomain = process.env.BASE_DOMAIN || process.env.NEXT_PUBLIC_BASE_DOMAIN;
  return baseDomain || "localhost";
}

export function getWebUrl(): string {
  const baseDomain = getBaseDomain();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return `https://${baseDomain}`;
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

export function getAllUrls() {
  return {
    baseDomain: getBaseDomain(),
    webUrl: getWebUrl(),
    apiUrl: getApiUrl(),
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
