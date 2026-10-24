# A firm in touch keeps its people's addresses at most 2 years after the last message

ADR 0043 erases the addresses of people at producers that never answer, but kept those at a firm in touch („cât discutăm cu firma”) with no end. Devize doesn't read the mailbox, so it can't tell when a conversation ended, and a firm that answered once would have kept its people's addresses for good. GDPR asks for a period, or the criteria that set it (art. 13(2)(a), 14(2)(a)), and no longer than the purpose needs (art. 5(1)(e)).

## The end date

At a firm in touch, people's addresses go 2 years after the last message between us that Devize knows of (`lastExchange` in `lib/retention.ts`), the later of:

- its last answer: `manufacturers.lastAnsweredAt`, set when a super admin changes the status to replied or norms received, when the profile is claimed, or with „Încă discutăm” on the producer's page, and its first answer (`answeredAt`);
- its last norm document (`normImports`);
- our last email to anyone at the firm, sent or opened to send.

The shortest 2 years are 730 days; the clock runs 725 (`IN_TOUCH_MS`), which leaves room for missed daily runs. The erasure is the same as for a firm that didn't answer (ADR 0043), recorded with the rule `inactive`, and doesn't stop an approved email, which would have started the clock again anyway.

A firm in touch before this change gets `lastAnsweredAt` at the next daily run: its first answer, or that day for one that only claimed its profile. Until then it keeps its people.

## Consequences

- An answer that only reaches the mailbox doesn't move the clock. The contacts panel shows the date and the „Încă discutăm” button whenever a firm in touch has people's addresses; a super admin presses it when the firm writes again.
- A claimed producer's people who use Devize keep their accounts; only the addresses found or typed for outreach go.
- The privacy page says „cât discutăm cu firma, dar cel mult 2 ani de la ultimul mesaj schimbat cu ea”.
