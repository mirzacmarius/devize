# A Producător's data sheet is read into a draft norm, each figure with its page

Writing a Normă de producător by hand means copying consumptions out of the product's technical data sheet, resource by resource, and working out the ones the sheet gives as a range or per millimetre of thickness. The Firmă that holds a Profil de producător can instead upload the data sheet as a PDF and have Devize AI write the draft.

The model reads the PDF whole and answers with a structured norm: the work and its unit, the product and its packaging, the resources one unit consumes, the conditions of applying the product and what the producer should check. A figure taken from the sheet carries the page of the PDF it is on and the sheet's own words, and says how it was worked out when it isn't copied as is. A figure the sheet doesn't give, most often the labour, carries no page, says it is an estimate, and is among the checks. Pages outside the document are dropped, so the figure becomes an estimate.

The draft is saved as the producer's own Normă, in draft, under the code the model proposes or the next one free, each resource with a note saying where its figure comes from. From there it is an ordinary draft: the producer corrects it on the norm form and sends it for review, and the Devize team checks it before it reaches the catalog, as for the norms a producer writes by hand.

## Consequences

- Only a firm that holds a Profil de producător starts a reading, from a PDF among its own files of at most 20 MB and 100 pages, and at most 10 an hour and 40 a day. Each reading is an AI job of the firm and the Producător, so it shows in the AI costs and in the Producător's admin page.
- The data sheet is the producer's own document, uploaded through the app into its firm's files; like every producer document, it never goes into the repository. Nothing read from it is published unless the producer sends the norm for review and Devize approves it, so no separate consent is recorded, unlike the norms a Producător emails to Devize.
- The norm's page shows the producer and Devize staff the sheet it came from: the file, opened at each page the norm uses, the product, the conditions and the checks. Contractors see the published norm with its resource notes, never the file, and a firm's copy of the norm doesn't carry the sheet.
- A reading whose job the watchdog failed counts as failed, whatever its row says, and an answer that comes after that saves nothing. A failed reading can be read again, with a new job, or let go with its file. A reading that made a draft stays as the record of where the norm came from, until the firm is deleted.
- Tests use made-up data sheets only.
