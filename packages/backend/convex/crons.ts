import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reads the pages of store products firms chose again, a few at a time
// (docs/adr/0010).
crons.interval(
  "refresh chosen store products",
  { minutes: 5 },
  internal.prices.refresh.refreshDue,
  {},
);

// Checks sent and accepted devize against today's prices, before the
// working day starts in Romania (04:00 UTC).
crons.cron(
  "check sent devize for price alerts",
  "0 4 * * *",
  internal.prices.alerts.sweep,
  {},
);

// Reads BNR's reference rates, published around 13:00 in Romania on banking
// days; the second run catches a late publication. Weekends read Friday's
// rate again, which is kept once (docs/adr/0042).
crons.cron(
  "read BNR exchange rates",
  "15 11,14 * * *",
  internal.exchange.rates.refresh,
  {},
);

// Erases the addresses of people at producers once the privacy page says
// they go, and research reports older than 25 days (docs/adr/0043).
crons.cron(
  "erase producer contacts past their time",
  "15 3 * * *",
  internal.manufacturers.retention.sweep,
  {},
);

export default crons;
