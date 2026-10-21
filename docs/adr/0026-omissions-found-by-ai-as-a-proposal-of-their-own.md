# Devize AI finds a Deviz's omissions, as a proposal of their own

Contractors lose money on what a Deviz leaves out: the waterproofing under a shower's tiles, the rubble a demolition makes, the primer before tiling, the scaffolding for a facade. An experienced site engineer catches these by reading the Deviz article by article. The Detector de omisiuni does that with Devize AI.

The check sends Claude the Deviz's articles in the order they print, each with a key (L1, L2…), its Capitol or Obiect, its quantity and unit, what its norm includes and excludes, and its materials, so the model doesn't propose what an article already covers. A tender's positions read as the authority's lists write them. Up to 600 articles go, and the request says how many were left out. The model answers with the missing works, each with its reason, the keys of the articles it is for, an Antemăsurătoare worked out from them, a recipe and search terms; with remarks on quantities that don't agree; and with questions. The missing works then go through the same norm matching as a drafted proposal.

What it finds is a Propunere AI with source `omissions`, reviewed and applied like any other. Each work keeps its reason as the line item's note and its Antemăsurătoare as a take-off with method `derived`, and goes into the Deviz's own Capitol when the model names one, however it writes it. We considered a table of its own for the findings, but their review, norm choice, quantities and applying are a proposal's, so the proposal tables take two fields, the articles a work is for (`basis`) and the article that seems to have it already (`duplicateOf`), and the check's remarks.

A Deviz's proposals now come in two lanes, each with at most one open: drafting, from a description or a tender's lists, and omissions. A check never sets aside a proposal waiting for review, and a new check sets aside only the previous check. A check doesn't start while a proposal is going into the Deviz.

## Consequences

- A work the Deviz seems to have already, by the same norm in any of its versions or by the same name, starts left out and names the article that has it. So do the works the model is unsure of.
- A Licitație's lists can't take new positions, so for a tender the missing works come back as clarifications to request from the contracting authority, ready to copy, and nothing goes into the Deviz.
- What the compatibility check (ADR 0028) found and the firm didn't hide goes in the request as already flagged, by the keys of its articles, so the check doesn't propose it again. For a tender, the missing works it names still come back as clarifications, since the bidder can't add them.
- Checks count against the same hourly and daily limits as drafted proposals, and use the same model.
- The Verificări card shows the newest check: not run, running, failed, with findings waiting for review (a warning), or with nothing found, applied or reviewed (passed). It never stops the Deviz from being sent.
- The Deviz's articles go to Anthropic only when someone starts a check.
