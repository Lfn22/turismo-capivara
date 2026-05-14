import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
