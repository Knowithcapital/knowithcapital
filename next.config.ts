import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/worker-based PDF rendering must load from node_modules, not the bundle
  serverExternalPackages: ['@napi-rs/canvas', 'unpdf'],
  // The tracker page template is read from disk at request time, so it must ship with that route
  outputFileTracingIncludes: {
    '/api/v1/quarterly-results/frame': ['./src/lib/tracker/template.html'],
  },
  async redirects() {
    return [
      // Products was merged into Services
      { source: '/products', destination: '/services', permanent: true },
    ];
  },
};

export default nextConfig;
