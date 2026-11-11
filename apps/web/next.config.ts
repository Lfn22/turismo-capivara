import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

const nextConfig: NextConfig = {
  // react-calendar@6 ships ESM-only; Next.js/webpack needs to transpile it
  transpilePackages: ['react-calendar'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-4752ac27cf6c45a399180b69342762c0.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Sentry 11: opções de build do webpack (substituem disableLogger/automaticVercelMonitors no topo)
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
})
