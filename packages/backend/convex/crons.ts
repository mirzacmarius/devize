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

export default crons;
