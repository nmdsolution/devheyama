"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ObjectImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Renders an object's image, falling back to a neutral placeholder if the
 * URL is missing or fails to load (expected until real R2 URLs exist).
 */
export function ObjectImage({ src, alt, className }: ObjectImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-xs text-muted-foreground",
          className
        )}
      >
        Image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote R2 image, host not yet known to configure next/image
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
