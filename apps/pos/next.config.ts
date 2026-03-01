import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@meso/core", "@meso/api-client", "@meso/supabase"],
};

export default nextConfig;
