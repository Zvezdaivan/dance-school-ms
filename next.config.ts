import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained production build (server.js + pruned node_modules) so the
  // app can be packaged as a portable Windows program — see scripts/package-win.ps1.
  output: "standalone",
  // Make sure the Prisma query engine is always traced into the standalone output.
  outputFileTracingIncludes: {
    "*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
