import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AEOCheck",
    short_name: "AEOCheck",
    start_url: "/",
    display: "standalone",
    background_color: "#050812",
    theme_color: "#050812",
  };
}

