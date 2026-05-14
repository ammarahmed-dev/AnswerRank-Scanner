import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AEOCheck: AI Search Readiness Scanner",
    short_name: "AEOCheck",
    description: "Scan any URL in 60 seconds. Get your AI search readiness score for ChatGPT, Perplexity, and Google AI.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    categories: ["productivity", "utilities", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
