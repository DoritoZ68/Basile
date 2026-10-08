import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Image de partage (réseaux sociaux, messageries) commune au site et aux fiches formation. */
export function renderOgImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "radial-gradient(circle at 85% 10%, #4b45c6 0%, #111327 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            É
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Élan Académie</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#fbbf24", marginBottom: 18 }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 45 ? 64 : 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
        </div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)" }}>{footer}</div>
      </div>
    ),
    OG_SIZE,
  );
}
