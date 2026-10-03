import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Branded blog cover (1200x630) used when AI image generation is unavailable.
// /api/og/post?title=...&tag=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "AEOCheck Blog").slice(0, 120);
  const tag = (searchParams.get("tag") ?? "AI Search").slice(0, 40);
  const titleSize = title.length > 70 ? 54 : title.length > 45 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0a0f 0%, #0b1a1a 60%, #06302a 100%)",
          color: "#ffffff",
          padding: "64px 72px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#00e5a0",
              color: "#04120d",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>AEOCheck</div>
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid rgba(0,229,160,0.45)",
              color: "#7ff5cf",
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {tag}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", maxWidth: 1050 }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", width: 640, height: 6, borderRadius: 999, background: "linear-gradient(90deg, #00e5a0, rgba(0,229,160,0.15))" }} />
          <div style={{ display: "flex", fontSize: 26, color: "#7ff5cf" }}>www.aeocheck.co/blog</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
