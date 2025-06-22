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
  
  // Aggressive webpack configuration fixes for bundling issues
  experimental: {
    esmExternals: false, // Disable ESM externals to prevent webpack async dependencies issues
    forceSwcTransforms: false, // Disable SWC transforms that can cause bundling issues
  },
  
  // Disable SWC minification which can cause "S is not a function" errors
  swcMinify: false,
  
  webpack: (config, { isServer, webpack }) => {
    // Fix for client-side module resolution issues
    if (!isServer) {
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
    }

    // Fix for dynamic imports causing webpack bundling issues
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    })

    // Prevent webpack from trying to parse certain files as ES modules
    config.module.rules.push({
      test: /\.js$/,
      enforce: 'pre',
      use: ['source-map-loader'],
      exclude: [
        /node_modules\/@next/,
        /node_modules\/next/,
      ],
    })

    // Fix for "You may need an appropriate loader" errors
    config.resolve.alias = {
      ...config.resolve.alias,
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
    }

    // Ensure proper handling of dynamic imports
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    }

    // Important: return the modified config
    return config
  },
}

module.exports = nextConfig 