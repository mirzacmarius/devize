import { brand } from "@/lib/brand";

/**
 * The app icon artwork, drawn for ImageResponse: a "D" on the brand colour.
 * A placeholder until the design system sets the final logo.
 */
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: brand.accent,
        color: brand.onAccent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.62,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      D
    </div>
  );
}
