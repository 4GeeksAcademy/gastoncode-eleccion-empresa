import type { NextConfig } from "next";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://127.0.0.1:8001";
const TALENT_API_URL = process.env.TALENT_API_URL ?? "http://127.0.0.1:8004";

const nextConfig: NextConfig = {
	basePath: "/talent-pipeline-tracker",
	async rewrites() {
		return [
			...["auth", "users", "profiles"].flatMap((resource) => [
				{ source: `/api/${resource}`, destination: `${AUTH_API_URL}/${resource}`, basePath: false as const },
				{ source: `/api/${resource}/:path*`, destination: `${AUTH_API_URL}/${resource}/:path*`, basePath: false as const },
			]),
			{ source: "/api/talent/:path+", destination: `${TALENT_API_URL}/talent/:path+`, basePath: false as const },
		];
	},
};

export default nextConfig;
