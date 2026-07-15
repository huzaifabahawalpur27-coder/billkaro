import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output so the Docker image only ships the compiled server.
  output: "standalone",
  devIndicators: false,
};

export default nextConfig;
