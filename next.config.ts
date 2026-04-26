import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Centralized list of third-party origins that the browser may legitimately
// connect to. Keep this list tight — anything not here is blocked by CSP.
const SUPABASE_HOST = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const LIVEKIT_HOST = "https://*.livekit.cloud wss://*.livekit.cloud";
const R2_HOST = "https://*.r2.cloudflarestorage.com https://*.r2.dev";
const PAYPAL_HOSTS = "https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com";
const SUPPORT_BOT = "https://api.anthropic.com";
// tldraw fetches its icon + asset bundle from this CDN at runtime.
const TLDRAW_HOST = "https://cdn.tldraw.com";

const csp = [
  "default-src 'self'",
  // Next.js needs unsafe-inline + unsafe-eval for React hydration / dev
  // tooling. Tightening further is a P2 — pin to a hash-list once the app
  // stabilizes.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PAYPAL_HOSTS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_HOST} ${R2_HOST} ${PAYPAL_HOSTS} ${TLDRAW_HOST}`,
  `media-src 'self' blob: ${SUPABASE_HOST} ${R2_HOST}`,
  `font-src 'self' data: ${TLDRAW_HOST}`,
  `connect-src 'self' ${SUPABASE_HOST} wss://${SUPABASE_HOST.replace("https://", "")} ${LIVEKIT_HOST} ${R2_HOST} ${PAYPAL_HOSTS} ${SUPPORT_BOT} ${TLDRAW_HOST}`,
  // tldraw uses Web Workers for image-export rasterisation. blob: scheme
  // is required because the worker bundle is materialised client-side.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  `frame-src 'self' ${PAYPAL_HOSTS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  // ffmpeg-static ships a platform binary that Next/webpack would otherwise
  // strip (it's required at runtime via a path resolved from the module's
  // directory, not as a JS import). Mark it external + include the binary
  // in the serverless function's file trace so `ffmpeg` resolves at runtime.
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  outputFileTracingIncludes: {
    "/api/recordings/post-process": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
