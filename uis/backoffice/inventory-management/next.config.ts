import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://127.0.0.1:8001";
const INVENTORY_API_URL = process.env.INVENTORY_API_URL ?? "http://127.0.0.1:8003";

const nextConfig: NextConfig = {
  basePath: "/inventory-management",
  async rewrites() {
    return [
      ...["auth", "users", "profiles"].flatMap((resource) => [
        {
          source: `/api/${resource}`,
          destination: `${AUTH_API_URL}/${resource}`,
          basePath: false as const,
        },
        {
          source: `/api/${resource}/:path*`,
          destination: `${AUTH_API_URL}/${resource}/:path*`,
          basePath: false as const,
        },
      ]),
      {
        source: "/api/inventory",
        destination: `${INVENTORY_API_URL}/inventory`,
        basePath: false,
      },
      {
        source: "/api/inventory/:path*",
        destination: `${INVENTORY_API_URL}/inventory/:path*`,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
