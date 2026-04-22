// Minimal shim for fluent-ffmpeg — only the builder methods we actually
// use. The package is JS-only and the DT @types was abandoned with the
// fluent-ffmpeg deprecation; we avoid pulling another dependency and
// declare just the surface area of our extract-audio wrapper.
declare module "fluent-ffmpeg" {
  type FfmpegCommand = {
    noVideo(): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(bitrate: string | number): FfmpegCommand;
    audioChannels(n: number): FfmpegCommand;
    audioFrequency(hz: number): FfmpegCommand;
    format(f: string): FfmpegCommand;
    on(event: "end", handler: () => void): FfmpegCommand;
    on(event: "error", handler: (err: Error) => void): FfmpegCommand;
    save(output: string): FfmpegCommand;
  };

  type FfmpegConstructor = {
    (input?: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  };

  const ffmpeg: FfmpegConstructor;
  export default ffmpeg;
}
