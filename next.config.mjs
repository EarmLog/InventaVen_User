import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.js",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: crypto.randomUUID() }],
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
};

export default withSerwist(nextConfig);
