/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  basePath: '',
  assetPrefix: '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  output: 'export',
  distDir: 'out'
};

export default nextConfig;
