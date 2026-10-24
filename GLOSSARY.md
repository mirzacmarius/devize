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

**Fișă tehnică** (technical data sheet):
A Producător's document for one product: what it is, how much of it a unit of work takes, how it's packed and how to apply it. The Firmă that holds a Profil de producător uploads one as a PDF for Devize AI to write a draft Normă de producător from, with the sheet's page for every figure; the Producător corrects the draft and sends it for review. In code: `datasheetImports`, `producers/datasheets.ts`. See `docs/adr/0022`.
_Avoid_: Spec sheet, product sheet

**Normă proprie** (own norm):
A Firmă's own Normă, seen and used only by that Firmă: written on the norm form, copied from the catalog to adjust, or written by Devize AI from a few sentences about a work the catalog lacks, with where each consumption comes from and orientative prices for materials; the Firmă checks it, and adding it to a Deviz publishes it in the Firmă's own catalog. In code: `norms` with source `organization`, `normRequests` and `catalog/aiNorms.ts` for the ones Devize AI writes. See `docs/adr/0034`.
_Avoid_: Private norm, custom norm

**Normă de bază** (base norm):
A generic Normă with no brand, from Devize's own catalog, written from scratch with current terms and materials. Devize does not use the 1981 norm indicators. The catalog ships with the code, in editions that a super admin publishes from Admin → Catalog de bază; its codes are DV-, the category and a number. Example: DV-ZID-03, 25 cm AAC block masonry. In code: `catalog/base/`, one file per category (two for Instalații sanitare), put together by `catalog/baseNorms.ts`. See `docs/adr/0012` and `docs/adr/0039`.
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

**Revizie** (revision) and **Comparare revizii** (revision comparison):
A new version of a Deviz under the same number, made from the estimate's menu after the client asked for changes: DVZ-0142-R2 is the second. Its Articole remember the ones they were copied from, so Comparare revizii pairs them and shows what each change did to the Recapitulație and to each Articol, with a summary to send the client. In code: `estimates.duplicate` with `asRevision`, `lineItems.originId`, `estimates/diff.ts`, at `/estimates/<id>/compare`. See `docs/adr/0048`.
_Avoid_: Version, Copie (a copy gets a new number)

**Șablon de deviz** (estimate template):
What a new Deviz starts from instead of an empty page. A Firmă saves any Deviz as one, keeping its Capitole and Articole with their quantities and Resurse but not its client, site, Cote or prices, which the new Deviz takes from the day it starts. Devize also ships its own (Baie, Bucătărie, Zugrăveli apartament, Termosistem, Acoperiș), written with the Norme de bază, that work out each quantity from a few measurements. In code: `estimateTemplates`, `estimateTemplateContents`, `templates/`, `templates/starters.ts`. See `docs/adr/0040`.
_Avoid_: Model, preset, Copie (a copy of one Deviz, with its client and prices)

**Preț țintă** (target price):
The price a client wants to pay, with or without VAT, and the Deviz brought to it through its profit rate or through all its labour prices by the same factor, never below what it costs with no profit or no labour. The dialog shows the margin left and flags labour under the legal minimum before it applies. In code: `estimates/target.ts`, `estimates/targetPrice.ts`. See `docs/adr/0041`.
_Avoid_: Budget, discount (a reduction shown to the client)

**Curs BNR** (BNR exchange rate):
The National Bank of Romania's reference rate for the euro, read each day, at which the Deviz and, when the firm chooses, the client's Ofertă show their total in EUR beside the lei. The price stays in lei; the euros are a comparison, with the rate and its day. In code: `exchangeRates`, `exchange/`, `offers.showEur`. See `docs/adr/0042`.
_Avoid_: Curs valutar (any exchange rate), conversion

**Antemăsurătoare** (quantity take-off):
The measured quantities behind a Deviz's Articole: rows of count × length × width × height, with the openings deducted, typed by hand or written from the Deviz's Camere, so an Articol's quantity is the sum of its rows and the Anexa Antemăsurătoare prints them after the Deviz. Devize AI writes rows too, from plans, photos or dictation. In code: `takeoffs`, `takeoffs/`. See `docs/adr/0033`.
_Avoid_: Measurement, survey

**Cameră** (room):
One space of a Deviz's site, measured once: its name and level, its length, width and height, or a floor area and a perimeter for an irregular shape, and its openings (doors, windows, others) with their count and size. Devize works out its floor, ceiling, walls with the openings deducted, perimeter, skirting with the doors deducted, and openings; an Articol's Antemăsurătoare takes the measure that fits its unit (floor and walls in mp, perimeter and skirting in m, doors and windows in buc) and follows the Cameră when it changes. In code: `rooms`, `takeoffs/measures.ts`. See `docs/adr/0033`.
_Avoid_: Încăpere, spațiu, zone

**Mod de montaj** (laying method):
How an Articol's covering is laid: straight, as its Normă assumes; offset, diagonally or in a herringbone for tiles and planks; with many cuts for boards. A method raises the covering's losses and the labour, always from the consumptions before any method, and the Deviz follows; the Firmă can change both figures before applying it. In code: `lineItems.layout`, `materials/layout.ts`. See `docs/adr/0027`.
_Avoid_: Pattern, installation type

**Propunere AI** (AI proposal):
What Devize AI suggests for a Deviz, from a description of the work and photos of it, or from a Licitație's Liste de cantități: Articole with their quantities and Norme, which a person checks before any of them goes into the Deviz. In code: `proposals`.
_Avoid_: Ofertă (what the client receives), draft

**Detector de omisiuni** (omissions check):
Devize AI reading a Deviz as an experienced site engineer would, for the works its Articole call for but it doesn't have, such as the waterproofing under a shower's tiles or the removal of a demolition's rubble. Each missing work comes with its reason, the Articole it is for and a quantity worked out from them, as a Propunere AI the Firmă reviews; the ones the Deviz has after all start left out. For a Licitație, whose lists can't take new positions, the missing works are clarifications to request from the contracting authority. In code: `proposals/omissions.ts`, proposals with source `omissions`. See `docs/adr/0026`.
_Avoid_: Audit, validator, AI review

**Sistem compatibil** (compatible system):
Works and materials that go together, such as floor tiles, their skirting and, in a bathroom, the waterproofing under them. Devize's base systems come from the Norme de bază; a Producător publishes its own on its profile, from its norms and products, with the places they suit and don't. A Deviz that holds part of a system is offered the rest of it (Restul sistemului), with a quantity worked out from the Articole it has. In code: `systems`, `systems/baseSystems.ts`, `systems/completion.ts`. See `docs/adr/0028`.
_Avoid_: Bundle, kit, package

**Combinație greșită** (wrong combination):
A material that doesn't suit where its Articol is done, such as a rigid tile adhesive on underfloor heating or wall tiles outdoors, found by Devize's own rules with why and the swap or Normă that fixes it. Read from the Articol's own words, it's a mistake; read from the Deviz's title or a neighbouring Articol, something to check. In code: `systems/rules.ts`, `systems/check.ts`. See `docs/adr/0028`.
_Avoid_: Conflict, incompatibility

**Variantă** (variant):
An alternative version of the same Deviz, such as economy, standard and premium, that the client chooses between. It puts other materials in some of the Deviz's works; the works and their quantities stay the same. In code: `variants`, made in `offers/variants.ts`. See `docs/adr/0021`.
_Avoid_: Option, version (a Normă has versions)

**Ofertă** (offer):
What the client receives: a secret link to a Deviz and its Variante, which they open without an account to choose, ask questions, then accept with their signature or decline. Sending it locks the Deviz. In code: `offers`, opened at `/o/<token>`. See `docs/adr/0016`.
_Avoid_: Deviz (for what the client sees), proposal

**Lucrare opțională** (optional work):
An Articol of an Ofertă that the client may include or leave out; the Firmă says whether it starts included. Every total the client sees is the server's, for what they chose. In code: `offers.optionalItems`.
_Avoid_: Extra, add-on

**Eșalonarea plății** (payment schedule):
How an Ofertă's price is paid: one to eight stages the Firmă names, each due at a moment of the works (la semnare, la începerea lucrărilor, pe situații de lucrări, la recepția lucrărilor, la recepția finală) as a share of the total with VAT or a fixed sum in lei. The client's page, the PDF and the confirmation email show the same stages; the deposit is the stage due at signing. In code: `offers.paymentSchedule`, `offers/payments.ts`. See `docs/adr/0038`.
_Avoid_: Payment terms (the whole of the conditions), instalments, tranșe

**Consumator** (consumer):
A client who is a private person acting outside a trade, so that accepting an Ofertă on its link makes a distance contract under OUG 34/2014: the page tells them their rights, they may withdraw for 14 days (the Formular de retragere, Anexa B, is theirs to download), they may ask expressly for an early start, and the firm confirms the contract to them by email, with the signed copy. A Firmă marks the client a consumer when it makes the link; a person is one unless it says otherwise. In code: `offers.consumer`, `offers/consumer.ts`. See `docs/adr/0038`.
_Avoid_: Customer (any client), persoană fizică (the kind of client, not the right)

**Dovezile semnării** (signing evidence):
What stands behind a client's electronic signature on an Ofertă (Legea 214/2024): the name typed, the moment, the SHA-256 hash of what they signed, the address the page's server saw and what the browser said about itself, plus the copy emailed to the client. In code: `offers.signature.contentHash`, `offers.signature.evidence`, `offers.confirmation`. See `docs/adr/0038`.
_Avoid_: Audit trail, certificate (a qualified signature's)

**Asistentul ofertei** (offer assistant):
Devize AI answering a client's questions on an Ofertă's link, only from what the link shows them. What the Ofertă doesn't say, or only the Firmă can decide, goes to the Firmă, who replies from the Deviz's page; the Firmă can also turn the assistant off for a link. In code: `offerQuestions`, `offers/assistant.ts`. See `docs/adr/0019`.
_Avoid_: Chatbot, bot

### Execution

**Situație de lucrări** (progress statement):
What an accepted Deviz's works came to in a period: each Articol with the quantity executed before, in the period and in all, what remains, and the period's value with the Deviz's Cote. One statement is open at a time; a new one starts once the beneficiary confirms the last, from the quantities it reached. In code: `workStatements`, `workStatementRows`, page `/estimates/<id>/progress`. See `docs/adr/0035`.
_Avoid_: Progress report, invoice (the statement is what an invoice is made from), situație de plată

**Atașament** (measurement sheet):
The measurements behind a quantity in a Situație de lucrări, a line each: count × length × width × height, some subtracted. In code: `workStatementRows.attachment`.
_Avoid_: Attachment (a file), annex

**Proces-verbal de recepție** (reception report):
The document that closes the works: la terminarea lucrărilor (at their end) and finală (at the end of the warranty), with the committee, its findings, the objections and their deadlines, and the decision to admit, postpone or reject (HG 343/2017). In code: `receptions`, kinds `completion` and `final`; the PDFs follow the regulation's models. See `docs/adr/0035`.
_Avoid_: Handover protocol, acceptance certificate

**Garanție de bună execuție** (performance guarantee):
What the contractor leaves with the beneficiary against defects, at most 10 % of the contract: kept back from each Situație de lucrări, or given as a bank or insurance instrument. 70 % comes back after the reception at the end of the works and 30 % after the final one, each within 14 days (HG 395/2016, art. 40 and 42). In code: `guarantees`, `progress/arithmetic.ts`. See `docs/adr/0035`.
_Avoid_: Retention money (only one way of holding it), warranty (the period, not the money)

### Invoicing

**Factură** (invoice):
What a Firmă bills a client for: the advance of an accepted Ofertă, a confirmed Situație de lucrări, or the rest of the Deviz once the works are done, with the advances deducted. It is shaped as a draft (ciornă), then issued: issuing gives it the next number of its Serie de facturare and freezes it; from then on it is paid, cancelled while it never left the firm, or reversed by a Storno. Its client and firm are copied onto it when it is made, so a later change to the client's card changes no issued invoice. In code: `invoices`, page `/invoices/<id>`. See `docs/adr/0037`.
_Avoid_: Bill, receipt, chitanță (the paper for cash received)

**Serie de facturare** (invoice series):
The letters an invoice's number starts with (DVZ, FA) and the number the next invoice gets. Numbers follow without gaps, so a wrong invoice is never deleted. A Firmă's first invoice starts the series DVZ at 1 unless it set up its own. In code: `invoiceSeries`, Setări → Facturare.
_Avoid_: Number range, prefix

**Factură de avans** (advance invoice):
The invoice for the deposit an accepted Ofertă asked, as a share of the accepted value without VAT. The final invoice deducts it with a negative line, so the client pays the rest once.
_Avoid_: Proforma (which is not an invoice), deposit receipt

**Storno** (reversal invoice):
The invoice that cancels an issued one, with its lines negated and a reference to it. Romanian practice and the Codul fiscal (art. 330) correct an invoice this way rather than by deleting it. In code: `invoices` with kind `storno`, `stornoOf` and `stornoedBy`.
_Avoid_: Credit note (the EN 16931 name; Romanian invoices use a negative invoice), deletion

**e-Factura**:
ANAF's system every invoice between Romanian firms, and to consumers, must reach within five working days of issue (OUG 89/2025), as UBL 2.1 XML in the CIUS-RO 1.0.1 format. Devize writes the XML, checks it against the rules ANAF checks and against ANAF's public validator, and keeps the deadline in sight; sending from Devize through SPV (Spațiul Privat Virtual) needs the firm's connection to ANAF. In code: `invoices/ubl.ts`, `invoices/rules.ts`, `invoices/anaf.ts`.
_Avoid_: E-invoice (generic), SPV (the portal, not the format)

**Încasare** (payment received):
Money the client paid on an invoice, with its date and how it came: transfer, cash, card. An invoice is paid once its încasări reach its total. In code: `invoices.payments`.
_Avoid_: Payment (ambiguous with what the firm pays), receipt

**Arhiva facturilor** (invoice archive):
A Firmă's numbered invoices in one .zip it keeps itself: each one's PDF and e-Factura XML, in a folder per year of issue, and the Registrul facturilor, an Excel workbook listing them all. The firm keeps its invoices 5 years (Legea 82/1991 art. 25); Devize deletes them with the firm when its last member deletes their account, after offering the archive. In code: `invoices/archive.ts`, `InvoiceArchiveButton`, on `/invoices` and in Setări → Șterge contul. See `docs/adr/0050`.
_Avoid_: Backup, export (the archive is the firm's legal copy)

### Public tenders

**Licitație** (tender):
A public procurement on SEAP whose documentation includes the lists of work quantities to price.
_Avoid_: Auction, bid (for the procedure itself)

**Listă de cantități** (bill of quantities):
A Licitație's list of the works to price, formularul F3: for each position its number, often an old indicator code, the work's text, the U.M. and the contracting authority's quantity. Devize imports it into a Deviz without changing the authority's U.M. or quantities, which each Articol keeps in `tenderRef`, and writes the Deviz's prices back into the authority's own .xlsx of the lists, in its layout. See `docs/adr/0023`.
_Avoid_: Antemăsurătoare (the Constructor's own measuring)

**Formulare oficiale** (official forms):
The forms a Licitație requires: the F series (F1–F6, DG, DO, used with HG 907/2016) and the C series of Ordinul 1014/2001 (C4–C5 quantity lists, C6–C9 resource lists). Numbering differs between contracting authorities, so each form is a configurable template. Devize downloads them as one PDF, or as one Excel workbook with a sheet for each form. See `docs/adr/0009` and `docs/adr/0025`.
_Avoid_: Reports, templates (for the forms themselves)

**Deviz general** (general estimate) and **Devizul obiectului** (object estimate):
The Deviz general totals an investment's costs in the chapters 1–7 of HG 907/2016, each split into subchapters such as 4.1.3 Arhitectură; the Devizul obiectului totals one Obiect's chapter 4. Devize places each Capitol under a subchapter, guessing from its name, and F1, F2 and F4 total the works the same way. C+M, the construction and installation works, are subchapters 1.2, 1.3, 1.4, 2, 4.1, 4.2 and 5.1.1. In code: `DG`, `DO` and `Subchapter`.
_Avoid_: Recapitulație (that closes one list of quantities), summary

**Graficul general** (general schedule):
Form F6: an investment's works over the months of its duration, as bars and as the value of each month. Devize plans it from the Deviz's labour hours and its subchapters, and the person sets the tender's duration. In code: `F6` and `schedule`.
_Avoid_: Timeline, Gantt chart (for the form)

**Formularul de ofertă** (offer form):
The bidder's letter at the head of a financial offer, which states the price without VAT and the VAT, each "în litere și în cifre", the duration of the works and how long the offer stays valid. Devize draws it filled from F1 and F6, and gives the value written out in Romanian, ready to copy wherever else the tender asks for it. In code: `OF`, `offerValue` and `leiInWords`.
_Avoid_: Ofertă (that is what a client receives for a private Deviz), cover letter

### People and companies

**Firmă** (company):
The account that owns devize, clients, rates and prices. Every record belongs to one Firmă, and only its members can see it. In code: `organizations`.
_Avoid_: Tenant, team, workspace

**Invitație** (invitation):
How a Firmă's owners and admins ask a colleague to join it, as a member or an admin: a link for one email address, which only someone signed in with that address can accept, within a week. In code: `invitations`.
_Avoid_: Invite code, join request

**Termenii Devize** (terms):
The contract between Devize and a Firmă: the Termeni de utilizare and the Acord de prelucrare a datelor, under which Devize processes the personal data of the Firmă's clients on its behalf (GDPR art. 28). They share one version, named after the day their text last changed in meaning. Whoever creates a Firmă accepts them for it by ticking a box; a Firmă made without them, and every Firmă after a new version, is asked from a notice above every page until an owner or admin accepts. Each acceptance keeps the version, who and when, while the Firmă exists. In code: `TERMS_VERSION` and `termsAcceptances`, at `/termeni` and `/acord-prelucrare-date`. See `docs/adr/0051`.
_Avoid_: ToS, EULA, consent (consent is a basis for processing data; the terms are a contract)

**Constructor** (contractor):
A Firmă or tradesperson who builds devize for their jobs.
_Avoid_: Builder, user (when meaning a contractor)

**Producător** (manufacturer):
A company that makes construction products and publishes Norme de producător for them. ROCKWOOL is the first pilot.
_Avoid_: Brand, vendor

**Profil de producător** (manufacturer profile):
A Producător's page in Devize: the Norme de producător and products it publishes and, once it is claimed, what the Producător writes about itself: a few lines, its site and a technical contact. Devize makes it from the documents the Producător sends; it shows once the first Normă is published, and goes away if the Producător asks and a super admin agrees. The Firmă that claimed it also writes new Norme de producător from it, by hand or from a Fișă tehnică, which the Devize team checks before they reach the catalog, publishing them or sending them back with a note. That Firmă and the Devize team also see its Statistici de utilizare. In code: `producers/profiles.ts` and `producerDetails`, at `/producers/<id>`.
_Avoid_: Brand page, storefront

**Statistici de utilizare** (usage statistics):
What a Producător learns of how firms use its Norme de producător and products, month by month over the last year: how often firms add its norms to a Deviz, how many devize with its norms or products are sent and accepted, how much of each product they hold and what the accepted part is worth, how often a client accepted another producer's product instead, and in which counties. Only the Firmă that holds its Profil and the Devize team see them, and never which firm: a county shows on its own only from 3 firms. In code: `producers/usage.ts`, at `/producers/<id>/stats`. See `docs/adr/0024`.
_Avoid_: Analytics, reports, insights

**Revendicare** (claim):
How someone who works for a Producător takes its Profil over for a Firmă: with the link in the thank-you a super admin sends to the address that sent the norms, at once with a verified address on one of the Producător's domains, or by a request a super admin checks, with the CUI looked up at ANAF. A Profil belongs to one Firmă. A link lasts 30 days and goes a month after it expires; when the person deletes their account, a decided claim keeps only what was decided, how and when. In code: `manufacturerClaims`, `claimLinks` and `manufacturerDomains`. See `docs/adr/0018` and `docs/adr/0047`.
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
_Avoid_: Cart, Lista de cumpărături (what to buy, not where)

**Lista de cumpărături** (shopping list):
A Deviz's materials summed over all its Articole and rounded up to whole Ambalaje, in the cheapest mix of sizes, with what is left over after the work and what that costs. It says what to buy; the Coș says where. In code: `materials/list.ts`, `materials/shoppingList.ts`. See `docs/adr/0027`.
_Avoid_: Bill of materials, Coș

**Ambalaj** (package):
What a material is sold in: a 25 kg bag, a 15 l bucket, a box of 1,44 mp. It comes from the Firmă's own, its Produs ales, the Producător's product or, failing those, the size Devize assumes, shown as one to check. In code: `packagings` for a Firmă's own, `materials/packages.ts`.
_Avoid_: Packaging unit, SKU

**Alertă de preț** (price alert):
A sent or accepted Deviz whose total would change by at least the Firmă's threshold (5 % unless it chose another) if it were priced today. It shows the total, the direct costs and the profit left if the client pays the price sent, with the resources that moved most. The Deviz itself never changes. In code: `priceAlerts`, checked every morning by `prices/alerts.ts`. See `docs/adr/0010`.
_Avoid_: Notification, price watch
