# A Producător claims its profile by link, by domain or after review

Devize makes a Producător's profile from the norms it sends, before anyone there has an account. The people who work there should be able to take it over, to confirm its norms and later add their own, without anyone else being able to pose as them: the profile carries the Producător's name to every contractor who uses its norms.

There are three ways to claim it, from the strongest proof to the weakest:

- **Link.** When a Producător sends its norms, a super admin makes a claim link for the address they came from and puts it in the thank-you email. The link works once, for 30 days, and only for someone signed in with that exact address, verified. Asking for a link again for the same address gives the one already out while it has two weeks left.
- **Domain.** A super admin types the Producător's email domains, as seen on its own site or in its emails. Anyone signed in with a verified address on one of them claims the profile at once. Free mail services such as gmail.com or yahoo.ro are refused, and a domain belongs to one Producător.
- **Review.** Anyone else asks, saying who they are and optionally giving the Producător's CUI. Devize looks the CUI up in ANAF's public register and shows the super admin some hints: whether the address is on the website's domain, whether ANAF's name resembles the Producător's, and whether the CUI is the one on file. None of them proves anything, since CUIs are public, so the super admin decides, and calls the Producător when in doubt.

## Consequences

- A profile belongs to one Firmă at most, through `organizations.manufacturerId`. The person claiming chooses one of their own Producător firms that holds no profile, or Devize creates a firm named after the Producător with them as its owner. Deleting that firm frees the profile.
- Only a verified address counts: Google's, or one proven with an emailed code.
- The profile shows only what the Producător would publish itself: its name, its logo once claimed, and its published norms and products. It never shows contacts, notes or research. Anyone signed in sees it once the first norm is published; before that, only Devize staff and the Producător's own firm do.
- Anyone can ask to take down a profile Devize made; a claimed one, only its own firm. If a super admin agrees, the Producător is excluded. Its profile disappears, its published norms are archived in batches of 100, and outreach stops. Devize already made keep their copies (ADR 0005). The norm documents the producer sent are then deleted, but not the proof of consent for the norms that were published (ADR 0046).
- One person can have at most 5 claims and 5 removal requests waiting.
- ANAF is asked about a CUI when the claim is sent, and again when a super admin asks. When it doesn't answer, the claim says so and waits.
- The claim link's address and token are kept, as are who claimed what, when and how.
