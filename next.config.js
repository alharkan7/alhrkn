/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // This is to handle the canvas dependency issue
    config.externals = [...config.externals, { canvas: 'canvas' }];

    // Handle the canvas.node binding
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'canvas.node': false,
    };

    return config;
  },
};

module.exports = nextConfig; 