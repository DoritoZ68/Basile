import { OG_SIZE, renderOgImage } from "@/lib/og";
import { CATEGORIES, courses, getCourse } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export const alt = "Formation Élan Académie";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  return renderOgImage({
    eyebrow: course ? CATEGORIES[course.category].label : "Formation",
    title: course?.title ?? "Élan Académie",
    footer: course ? `${course.level} · ${formatPrice(course.price)} · Accès à vie` : "",
  });
}
