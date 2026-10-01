import type { NextConfig } from "next";

const INCIDENTS_API_URL =
  process.env.INCIDENTS_API_URL ?? "http://127.0.0.1:8002";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${INCIDENTS_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
