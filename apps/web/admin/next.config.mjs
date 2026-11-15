/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@adityam/supabase', '@adityam/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
