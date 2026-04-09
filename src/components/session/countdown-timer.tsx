"use client";

import { useEffect, useState } from "react";

type CountdownTimerProps = {
  targetDate: Date;
  onReady?: () => void;
};

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export function CountdownTimer({ targetDate, onReady }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, targetDate.getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, targetDate.getTime() - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onReady?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onReady]);

  return (
    <span className="tabular-nums font-semibold text-[var(--ev-blue)]">
      {formatTimeLeft(timeLeft)}
    </span>
  );
}
