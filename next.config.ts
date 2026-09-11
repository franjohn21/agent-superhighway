import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/skill.md": ["./SKILL.md"],
  },
};

export default nextConfig;
