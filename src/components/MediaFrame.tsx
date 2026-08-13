"use client";

import { useState } from "react";
import Image from "next/image";
import type { Media } from "@/lib/content";
import { illustrationByKey } from "@/components/illustrations";
import { unsplashUrl } from "@/lib/images";

const BADGE_LABEL: Record<Media["kind"], string> = {
  illustration: "Illustration",
  image: "Photo",
  video: "Vidéo",
};

function renderPoster(poster: { src: string; alt: string } | keyof typeof illustrationByKey, sizes: string) {
  if (typeof poster === "string") {
    const Illustration = illustrationByKey[poster];
    return <Illustration className="h-full w-full" />;
  }
  return (
    <Image
      src={unsplashUrl(poster.src, 900)}
      alt={poster.alt}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}

export function MediaFrame({
  media,
  priority = false,
  sizes = "(min-width: 1024px) 480px, 100vw",
  rounded = "rounded-2xl",
  aspect = "aspect-[4/3] w-full",
  showBadge = true,
}: {
  media: Media;
  priority?: boolean;
  sizes?: string;
  rounded?: string;
  aspect?: string;
  showBadge?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`group relative overflow-hidden ${aspect} ${rounded} border border-line bg-panel`}>
      {showBadge && (
        <span className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {BADGE_LABEL[media.kind]}
        </span>
      )}

      {media.kind === "illustration" && (() => {
        const Illustration = illustrationByKey[media.key];
        return <Illustration className="h-full w-full transition duration-500 group-hover:scale-105" />;
      })()}

      {media.kind === "image" && (
        <Image
          src={unsplashUrl(media.src, 900)}
          alt={media.alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      )}

      {media.kind === "video" && (
        <>
          <div className="absolute inset-0">{renderPoster(media.poster, sizes)}</div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
          {!playing ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Lire la vidéo"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg transition group-hover:scale-110">
                <svg width="22" height="24" viewBox="0 0 22 24" fill="currentColor">
                  <path d="M0 0 L22 12 L0 24 Z" />
                </svg>
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/85 p-6 text-center">
              <p className="text-sm text-mist">{media.caption}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
