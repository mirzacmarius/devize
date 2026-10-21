# The general schedule is planned from the Deviz

F6, the general schedule of HG 907/2016's Anexa 10, shows each object and category of works over the months of the duration, physically and in value. A Deviz has no dates, so Devize plans one in `packages/forms/src/schedule.ts`. The duration is what a crew of ten needs for the Deviz's labour hours, working 21 days of 8 hours a month. Each category of works runs in the months its subchapter's works usually take, as shares of the duration: site organisation and earthworks first, then the structure, the building services and the finishes, and the equipment and the utility connections last. Demolitions come early and outdoor works late, whatever their subchapter. The person sets the tender's duration and moves any category's months in the forms sheet, which keeps them in the browser with the other choices (ADR 0014).

## Consequences

- Each category's value is shared evenly among its months, the odd bani in the first ones. The months then add up to F1's total to the ban, and the last cumulated value is that total.
- The schedule prints up to 36 months, a table for each year of twelve.
- Without prices, F6 is the designer's blank form: the works listed and the months left empty.
- The crew of ten only makes a first plan. The duration in the tender documentation replaces it, and the forms check asks for it until the person sets or confirms one (ADR 0017). The offer form prints the same duration (ADR 0020).
- Months chosen by hand are kept only where they differ from the plan, and they stay within the duration when it gets shorter.
