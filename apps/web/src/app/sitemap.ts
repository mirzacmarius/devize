import type { MetadataRoute } from "next";
import { works } from "@/content/works";
import { absolute } from "@/lib/site-url";

const pages = [
  "/",
  "/constructori",
  "/producatori",
  "/preturi",
  "/intrebari-frecvente",
  "/lucrari",
  ...works.map((work) => `/lucrari/${work.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({ url: absolute(path) }));
}
