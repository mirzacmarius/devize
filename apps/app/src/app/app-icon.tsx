import { brand } from "@/lib/brand";

/**
 * The app icon artwork, drawn for ImageResponse: the Devize "D" mark, as in
 * @devize/ui/logo. A `tile` has rounded corners, for icons shown as they are
 * (favicon, installed app); `full` fills the square for platforms that cut
 * their own shape (iOS, Android's maskable icon).
 */
export function AppIcon({
  size,
  shape = "tile",
}: {
  size: number;
  shape?: "tile" | "full";
}) {
  return (
    <div style={{ display: "flex", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          width="28"
          height="28"
          rx={shape === "tile" ? 8 : 0}
          fill={brand.accent}
        />
        <path
          d="M8.5 7.5H13.5A6.5 6.5 0 0 1 13.5 20.5H8.5ZM11.7 10.7V17.3H13.5A3.3 3.3 0 0 0 13.5 10.7Z"
          fill={brand.onAccent}
          fillRule="evenodd"
        />
      </svg>
    </div>
  );
}
