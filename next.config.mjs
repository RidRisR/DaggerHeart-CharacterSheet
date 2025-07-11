/** @type {import('next').NextConfig} */

const repo = 'DaggerHeart-CharacterSheet'

const assetPrefix = `/${repo}`
const basePath = `/${repo}`

const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  assetPrefix: assetPrefix,
  basePath: basePath,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
