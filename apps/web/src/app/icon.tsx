import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The browser tab's icon: the Devize "D" mark on its `brand` tile. */
export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: 32, height: 32 }}>
      <svg
        width={32}
        height={32}
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
    </div>,
    size,
  );
}
