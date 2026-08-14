import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // @catalyst/schema is published as TypeScript source rather than a build
  // artifact, so there is no build step to keep in sync with it.
  transpilePackages: ['@catalyst/schema'],
}

export default config
