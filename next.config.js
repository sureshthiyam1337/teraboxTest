const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    } else {
      // Add the following line to exclude fs module from being bundled in the server-side build
      config.externals.push({ fs: 'empty' });
    }
    return config;
  },
};

module.exports = {
  pageExtensions: ['jsx', 'js', 'ts', 'tsx', 'component.js'],
  ...nextConfig,
};
