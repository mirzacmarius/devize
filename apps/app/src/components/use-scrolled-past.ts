import { type RefObject, useEffect, useState } from "react";

/** Whether an element has scrolled away above the screen. */
export function useScrolledPast(
  target: RefObject<HTMLElement | null>,
  ready: boolean,
) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!ready || !element) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setPast(entry ? !entry.isIntersecting : false),
      { rootMargin: "-44px 0px 0px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, ready]);
  return past;
}
