import type { ReactNode } from "react";

/**
 * A page's main action: among its buttons, and on a phone in a bar at the
 * screen's foot, as on a Deviz and an Ofertă.
 */
export function FootAction({ children }: { children: ReactNode }) {
  return <div className="foot-action max-sm:foot-bar">{children}</div>;
}
