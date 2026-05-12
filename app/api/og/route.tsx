import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const alt = "AEOCheck - Free AEO & AI Search Readiness Scanner";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0f",
          color: "#ffffff",
          padding: "56px 64px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
            <div
              style={{
                fontSize: 104,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              AEOCheck
            </div>
            <div
              style={{
                fontSize: 42,
                lineHeight: 1.2,
                color: "#d6d3ff",
                maxWidth: 740,
              }}
            >
              Free AEO &amp; AI Search Readiness Scanner
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 8 }}>
            <div
              style={{
                width: 230,
                height: 230,
                borderRadius: 9999,
                border: "8px solid #7c6aff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(124, 106, 255, 0.08)",
                boxShadow: "0 0 0 14px rgba(124, 106, 255, 0.12)",
              }}
            >
              <span style={{ fontSize: 96, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>83</span>
            </div>
            <span style={{ fontSize: 24, color: "#b4adff", letterSpacing: "0.03em" }}>AI Visibility Score</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              height: 6,
              width: 720,
              borderRadius: 9999,
              background: "linear-gradient(90deg, rgba(124,106,255,0.95), rgba(124,106,255,0.35))",
            }}
          />
          <div style={{ fontSize: 28, color: "#bfb8ff", fontWeight: 600 }}>aeocheck.co</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

