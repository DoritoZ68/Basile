import { OG_SIZE, renderOgImage } from "@/lib/og";
import { courses } from "@/lib/catalog";

export const alt = "Élan Académie — formations numériques";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Formations en ligne",
    title: "Les compétences qui comptent vraiment en 2026.",
    footer: `${courses.length} formations · IA · Business · Marketing · Data`,
  });
}
