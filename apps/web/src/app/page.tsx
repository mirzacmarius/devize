import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { ClipboardList, Factory, ShoppingCart } from "lucide-react";
import { env } from "@/env";

const features = [
  {
    icon: Factory,
    title: "Norme de la producători",
    description:
      "Producătorii își încarcă normele de deviz pentru produsele lor, nu indicatoare vechi de zeci de ani.",
  },
  {
    icon: ShoppingCart,
    title: "Prețuri la zi",
    description:
      "Prețurile materialelor vin din marile magazine de bricolaj, actualizate când ai nevoie de ele.",
  },
  {
    icon: ClipboardList,
    title: "Formulare oficiale",
    description:
      "Formularele pentru licitații, generate direct din deviz, gata de depus.",
  },
];

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <span className="text-lg font-semibold tracking-tight text-primary">
          Devize
        </span>
        <h1 className="text-4xl font-medium tracking-tight text-primary md:text-6xl">
          Devize de construcții cu prețuri la zi
        </h1>
        <p className="max-w-xl text-base text-primary/60 md:text-lg">
          Norme de la producători, prețuri din magazine și formularele oficiale,
          într-un singur loc. Cu ajutorul AI.
        </p>
        <a
          href={env.NEXT_PUBLIC_APP_URL}
          className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
        >
          Intră în aplicație
        </a>
      </div>
      <ul className="mt-20 grid w-full max-w-5xl gap-6 md:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
          >
            <Icon className="h-6 w-6 stroke-[1.5px] text-primary/60" />
            <h2 className="text-base font-medium text-primary">{title}</h2>
            <p className="text-sm text-primary/60">{description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
