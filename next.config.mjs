/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const postgrestUrl = process.env.POSTGREST_URL || "http://localhost:3100";
    return {
      beforeFiles: [
        {
          source: "/rest/v1/:path*",
          destination: `${postgrestUrl}/:path*`,
        },
        {
          source: "/auth/v1/:path*",
          destination: "/api/auth-stub",
        },
      ],
    };
  },
};

export default nextConfig;
