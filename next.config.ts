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
// LiveKit's track-processors package fetches Mediapipe's WASM + the
// selfie segmenter model from these two CDNs at runtime. Without them
// in connect-src the model download silently fails and Background
// Blur "succeeds" but emits unblurred frames.
const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net";
const MEDIAPIPE_MODEL = "https://storage.googleapis.com";

const csp = [
  "default-src 'self'",
  // Next.js needs unsafe-inline + unsafe-eval for React hydration / dev
  // tooling. Tightening further is a P2 — pin to a hash-list once the app
  // stabilizes.
  // 'wasm-unsafe-eval' is required by Chrome 104+ for WebAssembly
  // compilation. MEDIAPIPE_WASM (cdn.jsdelivr.net) is needed because
  // @mediapipe/tasks-vision loads vision_wasm_internal.js as a
  // <script> tag at runtime, not a fetch — so script-src (not
  // connect-src) is what gates it.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${PAYPAL_HOSTS} ${MEDIAPIPE_WASM}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_HOST} ${R2_HOST} ${PAYPAL_HOSTS}`,
  `media-src 'self' blob: ${SUPABASE_HOST} ${R2_HOST}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_HOST} wss://${SUPABASE_HOST.replace("https://", "")} ${LIVEKIT_HOST} ${R2_HOST} ${PAYPAL_HOSTS} ${SUPPORT_BOT} ${MEDIAPIPE_WASM} ${MEDIAPIPE_MODEL}`,
  "worker-src 'self' blob:",
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
