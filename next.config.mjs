/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  basePath: isProd ? '/DaggerHeart-CharacterSheet' : '',
  assetPrefix: isProd ? '/DaggerHeart-CharacterSheet/' : '',
  images: {
    unoptimized: true,
  },
  output: 'export',
};

export default nextConfig;
