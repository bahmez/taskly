/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@taskly/trpc', '@taskly/shared'],
};

export default nextConfig;


