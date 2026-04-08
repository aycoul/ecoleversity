"use client";

import { useRef, useEffect, useCallback } from "react";

type VideoPlayerProps = {
  videoUrl: string;
  lessonId: string;
  enrollmentId: string | null;
  durationSeconds: number;
  onComplete: () => void;
};

const STORAGE_PREFIX = "ev_video_pos_";

export function VideoPlayer({
  videoUrl,
  lessonId,
  enrollmentId,
  durationSeconds,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  const storageKey = `${STORAGE_PREFIX}${lessonId}`;

  // Restore saved position on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const pos = parseFloat(saved);
      if (!isNaN(pos) && pos > 0) {
        video.currentTime = pos;
      }
    }

    completedRef.current = false;
  }, [lessonId, storageKey]);

  // Save position periodically and check for 90% completion
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Save position to localStorage every update
    localStorage.setItem(storageKey, String(video.currentTime));

    // Check if 90% watched
    const effectiveDuration = durationSeconds > 0 ? durationSeconds : video.duration;
    if (
      effectiveDuration > 0 &&
      video.currentTime >= effectiveDuration * 0.9 &&
      !completedRef.current &&
      enrollmentId
    ) {
      completedRef.current = true;
      onComplete();
    }
  }, [storageKey, durationSeconds, enrollmentId, onComplete]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        playsInline
        className="aspect-video w-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          // Clear saved position when video ends
          localStorage.removeItem(storageKey);
          if (!completedRef.current && enrollmentId) {
            completedRef.current = true;
            onComplete();
          }
        }}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
