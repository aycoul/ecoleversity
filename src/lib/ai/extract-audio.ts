import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Convert a composite LiveKit recording (mp4 with video+audio) to an
 * audio-only mp3. Whisper caps uploads at 25MB; even a 30-min class at 720p
 * blows past that as video, while mp3 at 64kbps stays ~15MB. This keeps
 * the transcription path on the happy side of the limit without changing
 * the LiveKit egress configuration.
 *
 * Works on Vercel (linux binary from ffmpeg-static) and locally on Windows
 * (windows binary from the same package). Writes to /tmp, cleans up on the
 * caller's success or failure.
 */

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function extractAudioToTempFile(videoBytes: Blob): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is not available on this platform");
  }

  const id = randomUUID();
  const inPath = join(tmpdir(), `ev-rec-${id}.mp4`);
  const outPath = join(tmpdir(), `ev-aud-${id}.mp3`);

  await fs.writeFile(inPath, Buffer.from(await videoBytes.arrayBuffer()));

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("64k")
      .audioChannels(1)
      .audioFrequency(16000) // Whisper downsamples to 16k anyway
      .format("mp3")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outPath);
  });

  const cleanup = async () => {
    await Promise.allSettled([fs.unlink(inPath), fs.unlink(outPath)]);
  };
  return { path: outPath, cleanup };
}
