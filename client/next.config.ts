import type { NextConfig } from "next"

const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "")

const nextConfig: NextConfig = {
  devIndicators: false,
  // Required for Docker standalone image — outputs a self-contained server
  // bundle to .next/standalone that doesn't need the full node_modules tree.
  output: "standalone",
  async rewrites() {
    if (!apiOrigin) return []

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
