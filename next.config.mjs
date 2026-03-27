/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/EngenP',
  assetPrefix: '/EngenP/',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
