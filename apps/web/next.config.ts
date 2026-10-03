import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // react-calendar@6 ships ESM-only; Next.js/webpack needs to transpile it
  transpilePackages: ["react-calendar"],
  images: {
    remotePatterns: [
      {
        // TODO: restringir ao host de armazenamento definitivo (ex: Railway, S3, Cloudinary)
        // após definir onde as imagens dos destinos serão hospedadas
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Sentry 11: opções de build do webpack (substituem disableLogger/automaticVercelMonitors no topo)
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
