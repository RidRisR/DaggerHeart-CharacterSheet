/** @type {import('next').NextConfig} */

const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const repo = 'DaggerHeart-CharacterSheet'

const assetPrefix = isGithubActions ? `/${repo}` : ''
const basePath = isGithubActions ? `/${repo}` : ''

const nextConfig = {
    assetPrefix: assetPrefix,
    basePath: basePath,
    output: 'export',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
