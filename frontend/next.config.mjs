/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // The signed-in app and the admin area are client-rendered layouts, which
    // cannot export per-page metadata, so keep them out of search results with
    // a header instead (robots.txt also disallows them).
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/dashboard/:path*", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
