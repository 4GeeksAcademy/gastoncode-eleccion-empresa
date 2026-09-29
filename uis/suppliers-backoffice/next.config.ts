import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8001";
const SUPPLIERS_API_URL =
  process.env.SUPPLIERS_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${AUTH_API_URL}/auth/:path*`,
      },
      {
        source: "/api/users/:path*",
        destination: `${AUTH_API_URL}/users/:path*`,
      },
      {
        source: "/api/users",
        destination: `${AUTH_API_URL}/users`,
      },
      {
        source: "/api/:path*",
        destination: `${SUPPLIERS_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
