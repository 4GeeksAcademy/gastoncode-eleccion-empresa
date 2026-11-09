import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8001";
const SUPPLIERS_API_URL = process.env.SUPPLIERS_API_URL ?? "http://localhost:8000";
const SUPPLIERS_UI_URL = process.env.SUPPLIERS_UI_URL ?? "http://localhost:3001";
const INCIDENTS_API_URL = process.env.INCIDENTS_API_URL ?? "http://localhost:8002";
const INCIDENTS_MANAGER_UI_URL = process.env.INCIDENTS_MANAGER_UI_URL ?? "http://localhost:3004";
const INCIDENTS_UI_URL = process.env.INCIDENTS_UI_URL ?? "http://localhost:3002";
const INVENTORY_API_URL = process.env.INVENTORY_API_URL ?? "http://localhost:8003";
const INVENTORY_UI_URL = process.env.INVENTORY_UI_URL ?? "http://localhost:3005";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
		{ source: "/suppliers", destination: `${SUPPLIERS_UI_URL}/suppliers` },
		{ source: "/suppliers/:path+", destination: `${SUPPLIERS_UI_URL}/suppliers/:path+` },
		{ source: "/suppliers-static/:path+", destination: `${SUPPLIERS_UI_URL}/suppliers-static/:path+` },
		{ source: "/api/suppliers", destination: `${SUPPLIERS_API_URL}/suppliers` },
		{ source: "/api/suppliers/:path+", destination: `${SUPPLIERS_API_URL}/suppliers/:path+` },
		{ source: "/incidents-manager", destination: `${INCIDENTS_MANAGER_UI_URL}/incidents-manager` },
		{ source: "/incidents-manager/:path+", destination: `${INCIDENTS_MANAGER_UI_URL}/incidents-manager/:path+` },
			{ source: "/inventory-management", destination: `${INVENTORY_UI_URL}/inventory-management` },
			{ source: "/inventory-management/:path+", destination: `${INVENTORY_UI_URL}/inventory-management/:path+` },
		{ source: "/incidents-analyzer", destination: `${INCIDENTS_UI_URL}/incidents-analyzer` },
		{ source: "/incidents-analyzer/:path+", destination: `${INCIDENTS_UI_URL}/incidents-analyzer/:path+` },
		{ source: "/api/incidents", destination: `${INCIDENTS_API_URL}/api/incidents` },
		{ source: "/api/incidents/:path+", destination: `${INCIDENTS_API_URL}/api/incidents/:path+` },
		{ source: "/api/inventory", destination: `${INVENTORY_API_URL}/inventory` },
		{ source: "/api/inventory/:path+", destination: `${INVENTORY_API_URL}/inventory/:path+` },
		...["auth", "users", "profiles"].flatMap((resource) => [
			{
				source: `/api/${resource}`,
				destination: `${AUTH_API_URL}/${resource}`,
			},
			{
				source: `/api/${resource}/:path*`,
				destination: `${AUTH_API_URL}/${resource}/:path*`,
			},
		]),
    ];
	},
};

export default nextConfig;
