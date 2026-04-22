import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ffmpeg-static ships a platform binary that Next/webpack would otherwise
  // strip (it's required at runtime via a path resolved from the module's
  // directory, not as a JS import). Mark it external + include the binary
  // in the serverless function's file trace so `ffmpeg` resolves at runtime.
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  outputFileTracingIncludes: {
    "/api/recordings/post-process": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default withNextIntl(nextConfig);
