import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
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
    domains: ["www.paypal.com"],
  },
  // async redirects() {
  //   return [
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
  //     {
  //       source: "/sendungen",
  //       destination: "/",
  //       permanent: true,
  //     },
  //     {
  //       source: "/uebersicht",
  //       destination: "/",
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;
