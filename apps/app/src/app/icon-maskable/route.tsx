import { ImageResponse } from "next/og";
import { AppIcon } from "../app-icon";

/**
 * The manifest's maskable icon: Android cuts its own shape from it, so the
 * colour fills the square. Not an `icon` file, so it never becomes a favicon.
 * It reads nothing from the request, so the build renders it once.
 */
export function GET() {
  return new ImageResponse(<AppIcon size={512} shape="full" />, {
    width: 512,
    height: 512,
  });
}
