/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/EngenP',
  assetPrefix: '/EngenP/',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
