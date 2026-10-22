import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://127.0.0.1:8001";
const INCIDENTS_API_URL =
  process.env.INCIDENTS_API_URL ?? "http://127.0.0.1:8002";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      ...["auth", "users", "profiles"].flatMap((resource) => [
        { source: `/api/${resource}`, destination: `${AUTH_API_URL}/${resource}` },
        {
          source: `/api/${resource}/:path*`,
          destination: `${AUTH_API_URL}/${resource}/:path*`,
        },
      ]),
      { source: "/api/incidents", destination: `${INCIDENTS_API_URL}/api/incidents` },
      {
        source: "/api/incidents/:path*",
        destination: `${INCIDENTS_API_URL}/api/incidents/:path*`,
      },
    ];
  },
};

export default nextConfig;
