import Link from "next/link";
import { CATEGORIES, lessonCount, totalMinutes, type Course } from "@/lib/catalog";
import { ACCENT } from "@/lib/accent";
import { formatDuration, formatPrice } from "@/lib/format";
import { CourseCover } from "@/components/CourseCover";

export function CourseCard({ course }: { course: Course }) {
  const accent = ACCENT[course.category];

  return (
    <Link
      href={`/formations/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-bg transition hover:-translate-y-0.5 hover:border-ink-faint/50 hover:shadow-[0_12px_32px_-12px_rgba(20,22,43,0.25)]"
    >
      <div className="relative">
        <CourseCover icon={course.icon} category={course.category} className="aspect-[16/9]" />
        {course.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14162b] shadow-sm">
            {course.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent.text}`}>
          {CATEGORIES[course.category].label}
        </p>
        <h3 className="mt-2 font-display text-lg leading-snug text-ink text-balance group-hover:text-brand">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{course.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
          <span>{course.level}</span>
          <span aria-hidden="true">·</span>
          <span>{lessonCount(course)} leçons</span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(totalMinutes(course))}</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-5">
          <span className="font-display text-xl text-ink">{formatPrice(course.price)}</span>
          <span className="text-sm font-semibold text-brand">Découvrir →</span>
        </div>
      </div>
    </Link>
  );
}
