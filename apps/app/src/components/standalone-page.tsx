import { Wordmark } from "@/components/wordmark";

/**
 * A page outside the app's sidebar, such as the sign-up steps or an
 * invitation: the wordmark on top and the content under it, on the shell.
 */
export function StandalonePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center gap-8 bg-shell px-4 pb-12 pt-10">
      <Wordmark className="text-xl" />
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
