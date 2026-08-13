import { CATEGORIES, type Category } from "@/lib/content";

const CATEGORY_STYLE: Record<Category, string> = {
  mercato: "text-gold bg-gold/10 ring-gold/25",
  match: "text-sky bg-sky/10 ring-sky/25",
  vestiaire: "text-violet bg-violet/10 ring-violet/25",
  video: "text-teal bg-teal/10 ring-teal/25",
};

export function CategoryPill({ category, className = "" }: { category: Category; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${CATEGORY_STYLE[category]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {CATEGORIES[category].label}
    </span>
  );
}
