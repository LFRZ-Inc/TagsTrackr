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
  // Note: Server Actions are enabled by default in Next.js 14
  
  // Webpack configuration fixes for bundling issues
  experimental: {
    esmExternals: false, // Disable ESM externals to prevent webpack async dependencies issues
  },
  
  webpack: (config, { isServer }) => {
    // Fix for client-side module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Ensure proper alias resolution
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    return config;
  },
  
  // Disable SWC minification to prevent terser issues
  swcMinify: false,
}

module.exports = nextConfig 