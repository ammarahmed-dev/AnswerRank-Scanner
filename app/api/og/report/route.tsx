import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") ?? "yoursite.com";
  const score = parseInt(searchParams.get("score") ?? "0", 10);
  const grade = searchParams.get("grade") ?? "Poor";

  const scoreColor = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            color: "#7c6aff",
            fontSize: "22px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "32px",
          }}
        >
          AEOCheck
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: "44px",
            fontWeight: "bold",
            marginBottom: "32px",
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          {domain}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "112px",
              fontWeight: "bold",
              color: scoreColor,
              lineHeight: "1",
            }}
          >
            {score}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                color: "#6b6b80",
                fontSize: "22px",
              }}
            >
              out of 100
            </div>
            <div
              style={{
                color: scoreColor,
                fontSize: "28px",
                fontWeight: "bold",
              }}
            >
              {grade}
            </div>
          </div>
        </div>

        <div
          style={{
            color: "#4a4a5a",
            fontSize: "20px",
          }}
        >
          Check your site free at aeocheck.co
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

