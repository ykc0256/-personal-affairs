import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Workaround for Next.js 16 /_global-error prerender invariant bug
    isrFlushToDisk: false,
  },
};

export default nextConfig;
