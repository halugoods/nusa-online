/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // sql.js uses fs only in Node.js; browser build doesn't need it
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

// Cloudflare adapter: skip when NUSA_LANDING=vercel (Vercel builds).
// Vercel sets this via vercel.json env.
if (process.env.NUSA_LANDING !== 'vercel') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
}
