/** @type {import('next').NextConfig} */
const isGithubPages = process.env.DEPLOY_TARGET === 'github-pages'

const nextConfig = {
  ...(isGithubPages ? { output: 'export' } : {}),
  basePath: isGithubPages ? '/EngenP' : '',
  assetPrefix: isGithubPages ? '/EngenP/' : '',
  trailingSlash: true,
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default nextConfig
