import type { NextConfig } from "next";

// Fail fast if required environment variables are missing
const REQUIRED_ENV = ["BACKEND_API_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Required environment variable "${key}" is not set. Aborting.`);
    process.exit(1);
  }
}

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.0.105'],
};

export default nextConfig;
