import type { Metadata } from "next";

export const SITE_NAME = "AEOCheck";
export const SITE_URL = "https://www.aeocheck.co";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/api/og`;

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  images?: string[];
  noindex?: boolean;
  keywords?: string[];
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  type = "website",
  images,
  noindex = false,
  keywords,
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialImages = (images?.length ? images : [DEFAULT_OG_IMAGE]).map((image) =>
    image.startsWith("http") ? image : absoluteUrl(image)
  );

  return {
    title,
    description,
    ...(keywords?.length
      ? {
          keywords,
        }
      : {}),
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: socialImages.map((image) => ({ url: image })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImages,
    },
  };
}
