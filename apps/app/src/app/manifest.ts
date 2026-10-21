import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { loaders } from "@/locales/loaders";
import { defaultLocale } from "@/locales/locale";

/**
 * The install manifest. Its address carries no language, so it describes the
 * app in the default language, in that dictionary's own words.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { common } = (await loaders[defaultLocale]()).default;
  return {
    name: common.appName,
    short_name: common.appName,
    description: common.appDescription,
    lang: defaultLocale,
    start_url: "/",
    display: "standalone",
    background_color: brand.lightBackground,
    theme_color: brand.accent,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
