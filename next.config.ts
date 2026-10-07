import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep watching inside this repo. Without this, Next walks up to
    // /home/tushar for bun.lock and exhausts the OS file-watch limit.
    root: path.join(__dirname),
  },
};

export default nextConfig;
