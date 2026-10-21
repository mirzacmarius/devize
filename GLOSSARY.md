# Devize

Devize is a web app where contractors build construction estimates (devize) from norms that manufacturers publish for their own products, priced with up-to-date retailer prices, and produce the official forms that public tenders require.

The domain words are Romanian, as contractors use them; each entry gives the English for code and docs.

## Language

### Estimating

**Deviz** (estimate):
The priced bill of works for one job: its Articole, grouped into Capitole and Obiecte, and its Recapitulație. Plural: devize. In code: `estimates`.
_Avoid_: Quote, budget, Ofertă (that is what the client receives)

**Normă** (norm):
A recipe for one unit of work: a code, a name, a unit of measure and the Resurse that one unit consumes, with how much of each. Example: wall tiling, per m². In code: `norms` and `normResources`.
_Avoid_: Indicator, standard, recipe

**Resursă** (resource):
One thing a Normă consumes, of one of four kinds: material, manoperă (labour), utilaj (equipment) or transport. Example: flexible tile adhesive, 4.5 kg per m²; a tiler, 0.9 hours per m². The catalog keeps each Resursă once, so a Firmă prices it once for every Normă. In code: `resources`, and `normResources` for a Normă's consumptions.
_Avoid_: Input, component, cost item

**Tarif** (rate):
A Firmă's own price for labour, equipment or transport, in lei per hour or per unit, such as 40 lei per hour for a tiler. In code: `companyRates`.
_Avoid_: Cost, wage

**Normă de producător** (manufacturer norm):
A Normă tied to a Producător's actual products, with consumptions taken from their technical data sheets. Example: thermal insulation system X, with its own adhesive and mesh.
_Avoid_: Branded norm, product recipe

**Normă de bază** (base norm):
A generic Normă with no brand, from Devize's own catalog, written from scratch with current terms and materials. Devize does not use the 1981 norm indicators. The catalog ships with the code, in editions that a super admin publishes from Admin → Catalog de bază; its codes are DV-, the category and a number. Example: DV-ZID-03, 25 cm AAC block masonry. In code: `catalog/baseNorms.ts`. See `docs/adr/0012`.
_Avoid_: Standard norm, indicator norm

**Articol de deviz** (line item):
One line of a Deviz: the chosen Normă, a quantity, and the Resurse prices on the Deviz's date. The line keeps its own copy of the Normă and prices, so a later change to either never alters a Deviz already sent. Example: 24 m² of wall tiling. In code: `lineItems`.
_Avoid_: Row, position (except for a Licitație's quantity lists)

**Capitol** (chapter) and **Obiect** (object):
How a Deviz groups its Articole: a Capitol by kind of work, an Obiect by building or network. Example: Capitol "Bathroom"; Obiect 1 "Building A". In code: `sections`.
_Avoid_: Category, group, folder

**Recapitulație** (summary):
A Deviz's totals for each kind of Resursă, plus its Cote: CAM on labour, indirect costs, profit and VAT. In code: `totals`, computed in `estimates/recap.ts`.
_Avoid_: Total, breakdown

**Cote** (markups):
The percentages a Recapitulație adds on top of the direct costs: CAM (contribuția asiguratorie pentru muncă) on labour, indirect costs on the direct costs, profit on direct plus indirect costs, and VAT on the total. Each Deviz copies them from its Firmă's defaults. In code: `markups`.
_Avoid_: Rates (a rate is a price per hour), fees

**Antemăsurătoare** (quantity take-off):
The measured quantities behind a Deviz's Articole, taken from plans, photos or site measurements. In code: `takeoffs`.
_Avoid_: Measurement, survey

**Propunere AI** (AI proposal):
What Devize AI suggests for a Deviz, from a description of the work and photos of it, or from a Licitație's Liste de cantități: Articole with their quantities and Norme, which a person checks before any of them goes into the Deviz. In code: `proposals`.
_Avoid_: Ofertă (what the client receives), draft

**Variantă** (variant):
An alternative version of the same Deviz, such as economy, standard and premium, that the client chooses between. In code: `variants`.
_Avoid_: Option, version (a Normă has versions)

**Ofertă** (offer):
What the client receives: a secret link to a Deviz and its Variante, which they open without an account to choose, ask questions, then accept with their signature or decline. Sending it locks the Deviz. In code: `offers`, opened at `/o/<token>`. See `docs/adr/0016`.
_Avoid_: Deviz (for what the client sees), proposal

**Lucrare opțională** (optional work):
An Articol of an Ofertă that the client may include or leave out; the Firmă says whether it starts included. Every total the client sees is the server's, for what they chose. In code: `offers.optionalItems`.
_Avoid_: Extra, add-on

### Public tenders

**Licitație** (tender):
A public procurement on SEAP whose documentation includes the lists of work quantities to price.
_Avoid_: Auction, bid (for the procedure itself)

**Listă de cantități** (bill of quantities):
A Licitație's list of the works to price, formularul F3: for each position its number, often an old indicator code, the work's text, the U.M. and the contracting authority's quantity. Devize imports it into a Deviz without changing the authority's U.M. or quantities, which each Articol keeps in `tenderRef`.
_Avoid_: Antemăsurătoare (the Constructor's own measuring)

**Formulare oficiale** (official forms):
The forms a Licitație requires: the F series (F1–F6, DG, DO, used with HG 907/2016) and the C series of Ordinul 1014/2001 (C4–C5 quantity lists, C6–C9 resource lists). Numbering differs between contracting authorities, so each form is a configurable template.
_Avoid_: Reports, templates (for the forms themselves)

**Deviz general** (general estimate) and **Devizul obiectului** (object estimate):
The Deviz general totals an investment's costs in the chapters 1–7 of HG 907/2016, each split into subchapters such as 4.1.3 Arhitectură; the Devizul obiectului totals one Obiect's chapter 4. Devize places each Capitol under a subchapter, guessing from its name, and F1, F2 and F4 total the works the same way. C+M, the construction and installation works, are subchapters 1.2, 1.3, 1.4, 2, 4.1, 4.2 and 5.1.1. In code: `DG`, `DO` and `Subchapter`.
_Avoid_: Recapitulație (that closes one list of quantities), summary

**Graficul general** (general schedule):
Form F6: an investment's works over the months of its duration, as bars and as the value of each month. Devize plans it from the Deviz's labour hours and its subchapters, and the person sets the tender's duration. In code: `F6` and `schedule`.
_Avoid_: Timeline, Gantt chart (for the form)

**Formularul de ofertă** (offer form):
The bidder's letter at the head of a financial offer, which states the price without VAT and the VAT, each "în litere și în cifre". Devize gives the value as F1 totals it, written out in Romanian, ready to copy into it. In code: `offerValue` and `leiInWords`.
_Avoid_: Ofertă (that is what a client receives for a private Deviz), cover letter

### People and companies

**Firmă** (company):
The account that owns devize, clients, rates and prices. Every record belongs to one Firmă, and only its members can see it. In code: `organizations`.
_Avoid_: Tenant, team, workspace

**Invitație** (invitation):
How a Firmă's owners and admins ask a colleague to join it, as a member or an admin: a link for one email address, which only someone signed in with that address can accept, within a week. In code: `invitations`.
_Avoid_: Invite code, join request

**Constructor** (contractor):
A Firmă or tradesperson who builds devize for their jobs.
_Avoid_: Builder, user (when meaning a contractor)

**Producător** (manufacturer):
A company that makes construction products and publishes Norme de producător for them. ROCKWOOL is the first pilot.
_Avoid_: Brand, vendor

**Profil de producător** (manufacturer profile):
A Producător's page in Devize: the Norme de producător and products it publishes, nothing else. Devize makes it from the documents the Producător sends; it shows once the first Normă is published, and goes away if the Producător asks and a super admin agrees. In code: `producers/profiles.ts`, at `/producers/<id>`.
_Avoid_: Brand page, storefront

**Revendicare** (claim):
How someone who works for a Producător takes its Profil over for a Firmă: with the link in the thank-you a super admin sends to the address that sent the norms, at once with a verified address on one of the Producător's domains, or by a request a super admin checks, with the CUI looked up at ANAF. A Profil belongs to one Firmă. In code: `manufacturerClaims`, `claimLinks` and `manufacturerDomains`. See `docs/adr/0018`.
_Avoid_: Verification, ownership request

**Furnizor** (supplier):
A company that sells construction products and publishes price lists or answers requests for quotation.
_Avoid_: Distributor (unless it only distributes), vendor

### Prices

**Listare** (listing):
One product's price at one source on one date: a retailer, a Furnizor's price list, a quotation, or the Firmă's own prices. In code: `listings`, with changes kept in `priceHistory`.
_Avoid_: Offer, price (for the record itself)

**Citire la cerere** (on-demand reading):
Reading a retailer's public price for a single product only when a Deviz needs it, cached and rate-limited, until a partnership gives Devize that retailer's feed. Devize never scrapes retailers' catalogs in bulk: it reads only the page a Constructor links to, and only its structured data, then again once a day while a Firmă has it as a Produs ales. In code: `storeReads`. See `docs/adr/0003`, `docs/adr/0008` and `docs/adr/0010`.
_Avoid_: Scraping, crawling

**Produs ales** (chosen store product):
The product a Firmă buys at a store for a material, at most one per store, with how many of the material's units one item sold holds (25 for a 25 kg bag of a material counted in kg). Its price comes before public listings. In code: `storeChoices`.
_Avoid_: Match, mapping

**Preț de referință** (reference price):
The indicative price a Normă gives each of its Resurse, in lei without VAT. It prices a Resursă only when the Firmă has no price of its own and no store price for it, as the last step of the price order. Devize's base catalog gives one to every Resursă it uses. In code: `normResources.referencePrice`, then `resources.referencePrice`. See `docs/adr/0005` and `docs/adr/0012`.
_Avoid_: Default price, list price

**Coș** (shopping basket):
A Deviz's materials split between the stores at the lowest total: each material is bought at one store, in whole items, and every store used adds its delivery, or the trip there, unless the order reaches its free-delivery threshold. In code: `prices/basket.ts` and `prices/basketPlan.ts`, with each Firmă's store fees in `priceSettings`.
_Avoid_: Cart, shopping list

**Alertă de preț** (price alert):
A sent or accepted Deviz whose total would change by at least the Firmă's threshold (5 % unless it chose another) if it were priced today. It shows the total, the direct costs and the profit left if the client pays the price sent, with the resources that moved most. The Deviz itself never changes. In code: `priceAlerts`, checked every morning by `prices/alerts.ts`. See `docs/adr/0010`.
_Avoid_: Notification, price watch
