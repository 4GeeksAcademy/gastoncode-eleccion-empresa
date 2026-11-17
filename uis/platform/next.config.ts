import type { NextConfig } from "next";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const UNIFIED_API_URL = process.env.UNIFIED_API_URL ?? "http://127.0.0.1:8005";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon-:size.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
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
    const apiRewrites = resources.flatMap(([resource, destination]) => [
      { source: `/api/${resource}`, destination },
      { source: `/api/${resource}/:path+`, destination: `${destination}/:path+` },
    ]);
    return [
      // Los navegadores solicitan automáticamente /favicon.ico en cada
      // visita a la raíz. Redirigimos al PNG 32×32 (moderno) para evitar
      // un 404 que genera ~9 KB de HTML prerenderizado sin cacheo.
      {
        source: "/favicon.ico",
        destination: "/favicon-32x32.png",
      },
      ...apiRewrites,
    ];
  },
};

export default nextConfig;
