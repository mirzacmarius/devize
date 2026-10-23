import { buttonVariants } from "@devize/ui/button";
import Link from "next/link";
import { Container } from "@/components/section";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-6 py-24 md:py-32">
      <p className="m-0 text-label uppercase text-ink-3">Pagină negăsită</p>
      <h1 className="m-0 text-title-page text-ink">
        Pagina asta nu există sau s-a mutat.
      </h1>
      <p className="m-0 max-w-xl text-body-lg text-ink-2">
        Pornește de la început sau vezi devizele pe tipuri de lucrări.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          Pagina de început
        </Link>
        <Link
          href="/lucrari"
          className={buttonVariants({ variant: "outline" })}
        >
          Lucrări
        </Link>
      </div>
    </Container>
  );
}
