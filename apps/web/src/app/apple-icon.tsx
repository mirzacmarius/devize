import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon iOS shows when the site is added to the home screen. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: 180, height: 180 }}>
      <svg
        width={180}
        height={180}
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="28" height="28" fill={brand.accent} />
        <path
          d="M8.5 7.5H13.5A6.5 6.5 0 0 1 13.5 20.5H8.5ZM11.7 10.7V17.3H13.5A3.3 3.3 0 0 0 13.5 10.7Z"
          fill={brand.onAccent}
          fillRule="evenodd"
        />
      </svg>
    </div>,
    size,
  );
}
