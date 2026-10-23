# Devize AI's allowances count for a person too, across all their firms

Devize AI's work costs Anthropic tokens, so each feature has an allowance per Firmă: six proposals an hour and thirty a day (descriptions, tender imports and omission checks together), ten data sheet readings an hour and forty a day, and two hundred answers a day to clients' questions on Oferte. Anyone can create up to 20 firms, though, so a script or a slip could start twenty times as much work by switching firms. The security audit of 23 October 2026 found this, and Marius asked to close it right away.

So each allowance now counts for the person too, across every firm they belong to, with the same limits as a firm. A job counts for whoever started it; an answer to a client's question counts for whoever sent the Ofertă. The jobs keep who that is (`aiJobs.createdBy`), and an index on it and the job's kind counts them in the last hour and day.

## Consequences

- Someone working in one firm reaches the firm's limit first, unless they delete work to make room: a deleted Deviz takes its proposals out of the firm's count, but its jobs still count for the person. A colleague in the same firm has their own allowance, within the firm's.
- A data sheet read again after it failed counts for the person, since it is a new job, while the firm counts readings, not tries.
- Over a person's limit a proposal or a reading is refused with the same `rate_limited` error as a firm's, so the interface says the same. A client's question goes to the firm instead, as it does over the firm's limit.
- Answers given before this change have no `createdBy` and count only for their firm.
- Many accounts are still many allowances. The cap that holds whatever happens is the monthly spend limit in the Anthropic Console.
