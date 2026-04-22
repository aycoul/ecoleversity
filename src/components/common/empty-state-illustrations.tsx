"use client";

import React from "react";

type IllustrationProps = {
  className?: string;
};

export function EmptyChildrenIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <circle cx="45" cy="50" r="12" fill="#1E40AF" opacity="0.15" />
      <circle cx="75" cy="50" r="12" fill="#F59E0B" opacity="0.15" />
      <path
        d="M60 70c-11 0-20 7-22 16h44c-2-9-11-16-22-16z"
        fill="#1E40AF"
        opacity="0.2"
      />
      <circle cx="45" cy="50" r="8" fill="#1E40AF" opacity="0.3" />
      <circle cx="75" cy="50" r="8" fill="#F59E0B" opacity="0.3" />
      <path d="M52 58c2 2 4 3 8 3s6-1 8-3" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 42v-6M41 46h-6M49 46h6" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" />
      <path d="M75 42v-6M71 46h-6M79 46h6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyClassesIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <rect x="35" y="38" width="50" height="36" rx="6" fill="#1E40AF" opacity="0.15" />
      <rect x="40" y="46" width="28" height="4" rx="2" fill="#1E40AF" opacity="0.3" />
      <rect x="40" y="54" width="20" height="4" rx="2" fill="#1E40AF" opacity="0.2" />
      <circle cx="82" cy="66" r="10" fill="#10B981" opacity="0.2" />
      <path d="M78 66l3 3 5-6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyCoursesIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <path d="M40 42h40v44H40z" fill="#1E40AF" opacity="0.15" rx="4" />
      <path d="M48 56h24M48 64h20M48 72h16" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <circle cx="82" cy="38" r="14" fill="#F59E0B" opacity="0.2" />
      <path d="M78 38l3 3 6-7" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyMessagesIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <rect x="32" y="38" width="56" height="40" rx="8" fill="#1E40AF" opacity="0.15" />
      <path d="M32 50h56M48 70l-8 10v-10" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="48" cy="54" r="3" fill="#1E40AF" opacity="0.3" />
      <circle cx="60" cy="54" r="3" fill="#1E40AF" opacity="0.3" />
      <circle cx="72" cy="54" r="3" fill="#1E40AF" opacity="0.3" />
    </svg>
  );
}

export function EmptySessionsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <circle cx="60" cy="60" r="24" stroke="#1E40AF" strokeWidth="4" opacity="0.15" />
      <path d="M60 44v16l10 6" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <circle cx="60" cy="60" r="4" fill="#1E40AF" opacity="0.3" />
      <path d="M85 35l6-6M35 35l-6-6M60 24v-8" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

export function EmptyAchievementsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
      <path d="M50 42h20l-4 28h-12z" fill="#F59E0B" opacity="0.2" />
      <circle cx="60" cy="76" r="8" fill="#F59E0B" opacity="0.2" />
      <path d="M56 50h8M56 56h6M56 62h4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M48 38l-4-6M72 38l4-6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
