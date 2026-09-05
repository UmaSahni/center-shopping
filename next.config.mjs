/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    const backendTarget = process.env.BACKEND_INTERNAL_URL || 'http://72.61.246.61:5000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
