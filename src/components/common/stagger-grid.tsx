"use client";

import { type ReactNode } from "react";
import { AnimateOnScroll } from "./animate-on-scroll";

type StaggerGridProps = {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  childCount?: number;
};

/**
 * Wraps children in AnimateOnScroll with automatic stagger delays.
 * Each direct child gets an increasing delay for a cascade reveal effect.
 *
 * Usage:
 *   <StaggerGrid className="grid grid-cols-4 gap-5" staggerDelay={80}>
 *     {items.map(item => <Card key={item.id} ... />)}
 *   </StaggerGrid>
 */
export function StaggerGrid({
  children,
  className = "",
  staggerDelay = 80,
}: StaggerGridProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <AnimateOnScroll key={i} delay={i * staggerDelay}>
              {child}
            </AnimateOnScroll>
          ))
        : children}
    </div>
  );
}
