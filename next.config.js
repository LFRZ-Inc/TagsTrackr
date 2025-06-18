/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/TagsTrackr',
  assetPrefix: '/TagsTrackr/',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig 