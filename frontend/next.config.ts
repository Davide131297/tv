import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.0.201"],
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  webpack: (config, { isServer }) => {
    // Exclude better-sqlite3 from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      config.externals = config.externals || [];
      config.externals.push("better-sqlite3");
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.paypal.com",
      },
      {
        protocol: "https",
        hostname: "api.microlink.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://polittalk-watcher-mobile.vercel.app",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
  //     {
  //       source: "/datenbank",
  //       destination: "/",
  //       permanent: true,
  //     },
  //     {
  //       source: "/parteien",
  //       destination: "/",
  //       permanent: true,
  //     },
  //     {
  //       source: "/politiker",
  //       destination: "/",
  //       permanent: true,
  //     },
  //     {
  //       source: "/politiker-rankings",
  //       destination: "/",
  //       permanent: true,
  //     },
  //     {
  //       source: "/politische-themen",
  //       destination: "/",
  //       permanent: true,
  //     },
    ];
  },
};

export default nextConfig;
