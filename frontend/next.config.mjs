import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fija la raíz del workspace a frontend/ para silenciar el warning
  // causado por el package-lock.json heredado en C:\Users\UJA\.
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["better-sqlite3"],
  // DB is copied into frontend/db/ by scripts/copy-db.js (prebuild/predev).
  outputFileTracingIncludes: {
    "/**/*": ["./db/gender_gap.db"],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ]
  },
}

export default nextConfig
