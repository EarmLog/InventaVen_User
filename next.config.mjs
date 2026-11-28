import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.js",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: crypto.randomUUID() }],
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

/** @type {import("next").NextConfig} */
const cabecerasPrivacidad = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: "/tienda/:path*", headers: cabecerasPrivacidad },
      { source: "/api/tienda/:path*", headers: cabecerasPrivacidad },
      { source: "/api/imagenes/:path*", headers: cabecerasPrivacidad },
    ];
  },
};

export default withSerwist(nextConfig);
