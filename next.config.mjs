/** @type {import('next').NextConfig} */

const isGithubActions = process.env.GITHUB_ACTIONS || false

let assetPrefix = ''
let basePath = ''

// 如果在 GitHub Actions 中运行，则设置 assetPrefix 和 basePath
if (isGithubActions) {
  const repo = 'DaggerHeart-CharacterSheet'
  assetPrefix = `/${repo}`
  basePath = `/${repo}`
}

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
