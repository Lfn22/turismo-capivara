import type { NextConfig } from "next";

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

export default nextConfig;
