/** @type {import('next').NextConfig} */
const nextConfig = {
  // For GitHub Pages static export (uncomment these lines if deploying to GitHub Pages)
  // output: 'export',
  // trailingSlash: true,
  // basePath: '/TagsTrackr',
  // assetPrefix: '/TagsTrackr/',
  // images: {
  //   unoptimized: true
  // }
  
  // For Vercel deployment (current configuration)
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 