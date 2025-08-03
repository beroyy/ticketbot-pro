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
};

export default nextConfig;
