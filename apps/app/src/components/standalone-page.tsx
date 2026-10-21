import { Wordmark } from "@/components/wordmark";

/**
 * A page outside the app's sidebar, such as the sign-up steps or an
 * invitation: the wordmark on top and the content on the grid backdrop.
 */
export function StandalonePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full bg-card">
      <div className="absolute left-1/2 top-8 mx-auto -translate-x-1/2 transform justify-center">
        <Wordmark className="text-2xl" />
      </div>
      <div className="z-10 h-screen w-screen">{children}</div>
      <div className="base-grid fixed h-screen w-screen opacity-40" />
      <div className="fixed bottom-0 h-screen w-screen bg-gradient-to-t from-[hsl(var(--card))] to-transparent" />
    </div>
  );
}
