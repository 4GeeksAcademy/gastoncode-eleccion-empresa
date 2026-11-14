import type { NextConfig } from "next";
import path from "node:path";
import { EXTERNAL_APP_PREFIXES } from "../backoffice/auth-shared/auth-navigation";

const root = path.resolve(import.meta.dirname, "../..");
const authApiUrl = process.env.AUTH_API_URL ?? "http://localhost:8001";
const legacyBackofficeUrl = process.env.LEGACY_BACKOFFICE_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  async redirects() {
    return EXTERNAL_APP_PREFIXES.flatMap((prefix) => [
      { source: prefix, destination: new URL(prefix, legacyBackofficeUrl).href, permanent: false },
      { source: `${prefix}/:path+`, destination: new URL(`${prefix}/:path+`, legacyBackofficeUrl).href, permanent: false },
    ]);
  },
  async rewrites() {
    return ["auth", "users", "profiles"].flatMap((resource) => [
      { source: `/api/${resource}`, destination: `${authApiUrl}/${resource}` },
      { source: `/api/${resource}/:path+`, destination: `${authApiUrl}/${resource}/:path+` },
    ]);
  },
};

export default nextConfig;
