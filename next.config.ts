import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/skill.md": ["./SKILL.md"],
  },
};

export default nextConfig;
