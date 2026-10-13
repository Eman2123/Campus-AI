// Fail the Vercel build early, with a clear message, instead of shipping a site
// that silently calls http://localhost:8000 from every visitor's browser.
if (process.env.VERCEL) {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!api || /localhost|127\.0\.0\.1/.test(api)) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be set to your deployed backend URL " +
        "(e.g. https://your-app.fastapicloud.dev) in the Vercel project's Environment Variables.",
    );
  }
}

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
