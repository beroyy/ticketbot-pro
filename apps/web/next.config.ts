import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ticketsbot/core/auth", "@ticketsbot/core"],
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "media.tenor.com",
      },
      {
        protocol: "https",
        hostname: "media.giphy.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.ignoreWarnings = [
        {
          module: /installHook\.js/,
        },
        {
          module: /react_devtools_backend/,
        },

        /Failed to parse source map/,
      ];
    }
    return config;
  },
};

export default nextConfig;
