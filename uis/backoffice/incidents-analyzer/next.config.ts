import type { NextConfig } from "next";

const INCIDENTS_API_URL =
  process.env.INCIDENTS_API_URL ?? "http://127.0.0.1:8002";
const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  basePath: "/incidents-analyzer",
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
        source: "/api/incidents/:path*",
        destination: `${INCIDENTS_API_URL}/api/incidents/:path*`,
        basePath: false as const,
      },
    ];
  },
};

export default nextConfig;
