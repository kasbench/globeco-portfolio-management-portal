/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Disable all minification for easier debugging
  compiler: {
    removeConsole: false,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable minification in webpack for client-side builds
    if (!dev && !isServer) {
      config.optimization.minimize = false
    }
    return config
  },
  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig 