import type { NextConfig } from "next";

const oneYearSeconds = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    const longCache = {
      key: "Cache-Control",
      value: `public, max-age=${oneYearSeconds}, immutable`,
    };

    return [
      {
        source: "/_next/static/:path*",
        headers: [longCache],
      },
      {
        source: "/fonts/:path*",
        headers: [longCache],
      },
      {
        source: "/images/:path*",
        headers: [longCache],
      },
      {
        source: "/favicon.ico",
        headers: [longCache],
      },
    ];
  },
};

export default nextConfig;
