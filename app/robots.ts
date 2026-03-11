import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/game", "/anime", "/manga", "/lightnovel", "/work"],
        disallow: ["/api/", "/trends", "/*/s/*"],
      },
    ],
    sitemap: "https://my9.baozangapp.com/sitemap.xml",
  };
}
