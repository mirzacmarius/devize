# The app opens on Acasă, which says what wants doing today

The app opened on the list of devize. A contractor with thirty devize in flight saw a table and had to remember, or click through, to find out which client hadn't answered, which tender closed this week and which Ofertă was about to lapse. Everything the app knew about the state of the firm's work sat on separate pages: the Ofertă's reads and questions on the Deviz, the price alerts under Prețuri, the tender's deadline in its fields. Nothing added it up.

## Acasă

The root of the app is Acasă (`/`), a page read in one query (`convex/home.ts`) with four figures, a list of what wants doing, the six devize touched last and, while the firm is new, its first steps.

The figures are the money the firm has in hand, in lei with VAT as the client sees it: the drafts' total, the total sent to clients with how many offers the client hasn't opened, the total accepted in the last 30 days with the all-time count, and the acceptance rate of the offers that were decided, accepted against accepted and rejected. The window is 30 days because a firm reads this page daily and a figure that only grows says nothing; the rate counts decided offers only, because a pending offer is neither.

"De făcut azi" lists, most pressing first, a client's question still waiting for the firm's answer, a price alert that moves a sent Deviz's total past the firm's threshold, a tender closing within 14 days, an Ofertă expiring within 7 days, and a sent Ofertă the client hasn't opened after 2 days. Each line names the Deviz and opens it (the alert opens Prețuri, where it is dismissed). Questions come first because someone is waiting; money second; dates after, nearest kind first. The thresholds are fixed, not settings: two days unread is when a call stops being pushy, a week is the notice a client needs to decide, and two weeks is the time a tender's Antemăsurătoare and forms take. The list holds at most twelve lines, so it stays a list of what to do and not another table.

The first steps are the three things without which a Deviz comes out wrong: the firm's CUI and address, which print on offers and forms; its Tarife, which price the labour; and a first Deviz. They show in the rail only until all three are done.

## Consequences

- The page reads up to 200 devize per status, 100 client questions and the live alerts; it is one query, so it updates as the data changes and costs nothing to keep open.
- The list of devize stays at `/estimates` and the sidebar leads with Acasă; the redirect from `/` to the list is gone.
- "Unread" means the Ofertă's status is still `sent`: a client who opened it once isn't nagged about, even if they haven't answered.
- The acceptance rate ignores archived devize and those never sent.
