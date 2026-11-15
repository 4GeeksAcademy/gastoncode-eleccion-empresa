import type { NextConfig } from "next";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const authApiUrl = process.env.AUTH_API_URL ?? "http://localhost:8001";
const suppliersApiUrl = process.env.SUPPLIERS_API_URL ?? "http://localhost:8000";
const incidentsApiUrl = process.env.INCIDENTS_API_URL ?? "http://127.0.0.1:8002";
const inventoryApiUrl = process.env.INVENTORY_API_URL ?? "http://127.0.0.1:8003";
const talentApiUrl = process.env.TALENT_API_URL ?? "http://127.0.0.1:8004";

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  async rewrites() {
    const resources = [
      ...["auth", "users", "profiles"].map((resource) => [resource, `${authApiUrl}/${resource}`]),
      ["suppliers", `${suppliersApiUrl}/suppliers`],
      ["incidents", `${incidentsApiUrl}/api/incidents`],
      ["inventory", `${inventoryApiUrl}/inventory`],
      ["talent", `${talentApiUrl}/talent`],
    ];
    return resources.flatMap(([resource, destination]) => [
      { source: `/api/${resource}`, destination },
      { source: `/api/${resource}/:path+`, destination: `${destination}/:path+` },
    ]);
  },
};

export default nextConfig;
