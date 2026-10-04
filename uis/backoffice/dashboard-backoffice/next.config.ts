import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
	async rewrites() {
		return ["auth", "users", "profiles"].flatMap((resource) => [
			{
				source: `/api/${resource}`,
				destination: `${AUTH_API_URL}/${resource}`,
			},
			{
				source: `/api/${resource}/:path*`,
				destination: `${AUTH_API_URL}/${resource}/:path*`,
			},
		]);
	},
};

export default nextConfig;
