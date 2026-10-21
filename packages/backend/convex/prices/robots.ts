// robots.txt, as RFC 9309 reads it. Devize reads a store's product page only
// when its robots.txt allows it.

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };

function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  // A run of user-agent lines opens a group; a user-agent line after rules
  // opens the next one.
  let readingAgents = false;
  for (const rawLine of robotsTxt.split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || !readingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      readingAgents = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      readingAgents = false;
      // An empty Disallow allows everything, the same as no rule.
      if (value) {
        current.rules.push({ allow: field === "allow", pattern: value });
      }
    }
  }
  return groups;
}

/** Whether a rule's pattern, with its `*` and `$`, matches the path. */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

/**
 * Whether robots.txt lets the crawler named `agent` fetch `path`. The groups
 * naming the agent apply, else those for every crawler ("*"); the longest
 * matching rule wins, and Allow wins a tie.
 */
export function robotsAllows(
  robotsTxt: string,
  agent: string,
  path: string,
): boolean {
  const groups = parseGroups(robotsTxt);
  const name = agent.toLowerCase();
  const own = groups.filter((group) => group.agents.includes(name));
  const applicable =
    own.length > 0 ? own : groups.filter((group) => group.agents.includes("*"));
  let best: Rule | null = null;
  for (const rule of applicable.flatMap((group) => group.rules)) {
    if (!matches(rule.pattern, path)) {
      continue;
    }
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }
  return best?.allow ?? true;
}
