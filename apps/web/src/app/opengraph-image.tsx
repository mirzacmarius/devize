import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { siteTitle } from "@/content/site";
import { brand } from "@/lib/brand";

export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const claims = [
  "Norme de la producători",
  "Prețuri citite azi",
  "Formulare F1–F6, DG, DO",
];

/** The picture a shared link shows: the mark, the promise, three claims. */
export default async function Image() {
  // The font files come from the hoisted `geist` package; the build copies
  // them next to this route as assets and `import.meta.url` points there.
  const [light, medium] = await Promise.all([
    readFile(
      new URL(
        "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Light.ttf",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf",
        import.meta.url,
      ),
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: brand.lightBackground,
        color: brand.ink,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg
          width={56}
          height={56}
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="28" height="28" rx="8" fill={brand.accent} />
          <path
            d="M8.5 7.5H13.5A6.5 6.5 0 0 1 13.5 20.5H8.5ZM11.7 10.7V17.3H13.5A3.3 3.3 0 0 0 13.5 10.7Z"
            fill={brand.onAccent}
            fillRule="evenodd"
          />
        </svg>
        <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: -0.5 }}>
          Devize
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 84,
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: -2.5,
          maxWidth: 1000,
        }}
      >
        Devizul corect, cu prețurile de azi.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {claims.map((claim) => (
          <span
            key={claim}
            style={{
              display: "flex",
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "12px 22px",
              borderRadius: 999,
              border: "2px solid #e8e8e6",
              fontSize: 26,
              fontWeight: 500,
              color: "#50504e",
            }}
          >
            {claim}
          </span>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist", data: light, weight: 300, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
