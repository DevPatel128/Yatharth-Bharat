import type { NextConfig } from "next";

// Static export: every page is prerendered from versioned, verified data at build time and served by
// Cloudflare Workers static assets. A small Worker (worker/index.ts) handles the few dynamic paths.
// Why not OpenNext: @opennextjs/cloudflare 1.20.10 crashes on Next 16.4 at runtime (DECISIONS.md D-002).
// Security headers live in public/_headers because static export cannot set them here.
const nextConfig: NextConfig = {
  output: "export",
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
