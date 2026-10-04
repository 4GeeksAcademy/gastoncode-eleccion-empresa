import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8001";
const SUPPLIERS_API_URL = process.env.SUPPLIERS_API_URL ?? "http://localhost:8000";
const SUPPLIERS_UI_URL = process.env.SUPPLIERS_UI_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
		{ source: "/suppliers", destination: `${SUPPLIERS_UI_URL}/suppliers` },
		{ source: "/suppliers/:path+", destination: `${SUPPLIERS_UI_URL}/suppliers/:path+` },
		{ source: "/suppliers-static/:path+", destination: `${SUPPLIERS_UI_URL}/suppliers-static/:path+` },
		{ source: "/api/suppliers", destination: `${SUPPLIERS_API_URL}/suppliers` },
		{ source: "/api/suppliers/:path+", destination: `${SUPPLIERS_API_URL}/suppliers/:path+` },
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
