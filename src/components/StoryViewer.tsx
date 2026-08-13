"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Story } from "@/lib/content";
import { CATEGORIES } from "@/lib/content";
import { ACCENT, type Accent } from "@/lib/accent";
import { relativeDate } from "@/lib/date";

const SLIDE_MS = 5000;
const END_CARD = 3;

type Position = { storyIndex: number; slideIndex: number };

export function StoryViewer({ stories, initialSlug }: { stories: Story[]; initialSlug: string }) {
  const router = useRouter();
  const [pos, setPos] = useState<Position>(() => ({
    storyIndex: Math.max(0, stories.findIndex((s) => s.slug === initialSlug)),
    slideIndex: 0,
  }));
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const story = stories[pos.storyIndex];
  const accent = ACCENT[CATEGORIES[story.category].accent];
  const isLastStory = pos.storyIndex === stories.length - 1;

  const close = useCallback(() => router.push("/"), [router]);

  const goNext = useCallback(() => {
    setPos((p) => {
      if (p.slideIndex < END_CARD) return { ...p, slideIndex: p.slideIndex + 1 };
      if (p.storyIndex < stories.length - 1) return { storyIndex: p.storyIndex + 1, slideIndex: 0 };
      return p;
    });
  }, [stories.length]);

  const goPrev = useCallback(() => {
    setPos((p) => {
      if (p.slideIndex > 0) return { ...p, slideIndex: p.slideIndex - 1 };
      if (p.storyIndex > 0) return { storyIndex: p.storyIndex - 1, slideIndex: 2 };
      return p;
    });
  }, []);

  // Keep the URL in sync with the active story (replace only — no history spam per slide).
  useEffect(() => {
    window.history.replaceState(null, "", `/histoire/${story.slug}`);
  }, [story.slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goNext, goPrev]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (paused || pos.slideIndex === END_CARD) return;
    const t = setTimeout(goNext, SLIDE_MS);
    return () => clearTimeout(t);
  }, [pos, paused, goNext]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }
  function onTouchEnd(e: React.TouchEvent) {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) goPrev();
    else goNext();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 sm:p-6">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-ink shadow-2xl sm:h-[calc(100vh-3rem)] sm:max-h-[880px] sm:rounded-[28px]">
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 p-3">
          {[0, 1, 2].map((i) => {
            const status =
              i < pos.slideIndex || pos.slideIndex === END_CARD
                ? "done"
                : i === pos.slideIndex
                  ? "active"
                  : "pending";
            return (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full origin-left rounded-full bg-white"
                  style={
                    status === "done"
                      ? { transform: "scaleX(1)" }
                      : status === "pending"
                        ? { transform: "scaleX(0)" }
                        : {
                            animation: `story-progress ${SLIDE_MS}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-0 top-6 z-20 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            <span className="text-xs font-semibold text-white">{CATEGORIES[story.category].label}</span>
            <span className="text-xs text-white/60">· {relativeDate(story.publishedAt)}</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 4L20 20M20 4L4 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex-1"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
        >
          {pos.slideIndex < END_CARD ? (
            <>
              <SlideView story={story} index={pos.slideIndex} accent={accent} />
              <button
                type="button"
                aria-label="Précédent"
                onClick={goPrev}
                className="absolute inset-y-0 left-0 z-10 w-[35%] cursor-w-resize"
              />
              <button
                type="button"
                aria-label="Suivant"
                onClick={goNext}
                className="absolute inset-y-0 right-0 z-10 w-[65%] cursor-e-resize"
              />
            </>
          ) : (
            <EndCard story={story} accent={accent} hasNext={!isLastStory} onNext={goNext} />
          )}
        </div>
      </div>
    </div>
  );
}

function SlideView({ story, index, accent }: { story: Story; index: number; accent: (typeof ACCENT)[Accent] }) {
  return (
    <div className="absolute inset-0">
      <Image src={story.cover.src} alt={story.cover.alt} fill priority sizes="480px" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 pb-10">
        <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${accent.bg}`}>
          {index + 1} / 3
        </span>
        <h1 className="text-balance font-display text-2xl leading-tight text-white">{story.title}</h1>
        <p className="text-balance text-lg leading-snug text-white/95">{story.points[index]}</p>
      </div>

      {story.cover.credit && (
        <span className="absolute right-3 top-16 text-[10px] text-white/45">© {story.cover.credit}</span>
      )}
    </div>
  );
}

function EndCard({
  story,
  accent,
  hasNext,
  onNext,
}: {
  story: Story;
  accent: (typeof ACCENT)[Accent];
  hasNext: boolean;
  onNext: () => void;
}) {
  return (
    <div className={`absolute inset-0 flex flex-col justify-center gap-6 p-8 ${accent.tint}`}>
      <div>
        <span className={`text-xs font-bold uppercase tracking-wide ${accent.text}`}>Pour aller plus loin</span>
        <p className="mt-3 text-balance font-display text-xl leading-snug text-ink">{story.more}</p>
      </div>

      {story.cover.credit && <p className="text-xs text-ink-faint">Photo : {story.cover.credit}</p>}

      <div className="flex flex-col gap-2.5">
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className={`rounded-full px-5 py-3 text-sm font-semibold text-white ${accent.bg}`}
          >
            Histoire suivante →
          </button>
        )}
        <Link
          href="/"
          className="rounded-full border border-ink/10 bg-white px-5 py-3 text-center text-sm font-semibold text-ink"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
