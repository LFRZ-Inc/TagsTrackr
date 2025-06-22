/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration to ensure deployment works
  reactStrictMode: true,
  swcMinify: false, // Disable SWC minification
  experimental: {
    esmExternals: false, // Disable ESM externals
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Disable problematic optimizations
    config.optimization = {
      ...config.optimization,
      minimize: false, // Disable minification completely
    }
    
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    }
    
    return config
  },
}

module.exports = nextConfig 