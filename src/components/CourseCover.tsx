import type { CategoryKey, IconName } from "@/lib/catalog";
import { ACCENT, PACK_COVER } from "@/lib/accent";
import { Icon } from "@/components/Icon";

/** Illustration générée en CSS : dégradé de la catégorie + icône, aucune image à gérer. */
export function CourseCover({
  icon,
  category,
  size = "md",
  className = "",
}: {
  icon: IconName;
  category: CategoryKey | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const gradient = category ? ACCENT[category].cover : PACK_COVER;
  const iconSize = size === "lg" ? 72 : size === "md" ? 44 : 22;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: size === "sm" ? "8px 8px" : "16px 16px",
        }}
        aria-hidden="true"
      />
      <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
      <div className="relative flex h-full w-full items-center justify-center text-white">
        <Icon name={icon} size={iconSize} />
      </div>
    </div>
  );
}
