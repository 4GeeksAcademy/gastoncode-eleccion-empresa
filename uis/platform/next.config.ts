import type { NextConfig } from "next";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const UNIFIED_API_URL = process.env.UNIFIED_API_URL ?? "http://127.0.0.1:8005";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root },
  outputFileTracingRoot: root,
  async rewrites() {
    const resources = [
      ["auth", `${UNIFIED_API_URL}/auth`],
      ["users", `${UNIFIED_API_URL}/auth/users`],
      ["profiles", `${UNIFIED_API_URL}/auth/profiles`],
      ["suppliers", `${UNIFIED_API_URL}/suppliers`],
      ["incidents", `${UNIFIED_API_URL}/api/incidents`],
      ["inventory", `${UNIFIED_API_URL}/inventory`],
      ["talent", `${UNIFIED_API_URL}/talent`],
    ];
    return resources.flatMap(([resource, destination]) => [
      { source: `/api/${resource}`, destination },
      { source: `/api/${resource}/:path+`, destination: `${destination}/:path+` },
    ]);
  },
};

export default nextConfig;
