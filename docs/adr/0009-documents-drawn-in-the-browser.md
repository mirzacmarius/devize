# Documents drawn in the browser

A Deviz leaves Devize as documents: the PDF its client gets, and the official forms a Licitație asks for. The first of these are the lists of quantities (F3 of HG 907/2016, one per category of works, and C5 of Ordinul 1014/2001) and the resource lists C6 to C9; F1, F2, F4, F5, DG, DO and F6 follow. They are drawn in the browser from the Deviz the page already has, with pdf-lib and the app's own font, Geist, by `packages/forms`: builders turn a Deviz into blocks and tables (`src/model.ts`), and one renderer lays any of them out on A4, repeating table headers, keeping totals with their signatures and numbering each document's pages. No Convex function, table or server time is involved, and an Excel export can reuse the same builders.

## Consequences

- The documents are in Romanian whatever the interface language, as tenders require.
- Each category of works closes on its own Recapitulație, CAM, indirect costs and profit computed on its own items, the way F3 adds up. The categories together can differ from the Deviz's total by a few bani.
- The resource lists sum each resource's consumption over the line items and price it once, so they can differ from the lists of quantities, which round each unit cost to bani. A line for that rounding makes C6 to C9 add up to the same totals as F3 and C5.
- A line imported from a tender prints the authority's position, code, text, unit and quantity (`lineItems.tenderRef`), whatever its norm counts in. When the quantities differ, its unit prices are its totals over the tender's quantity, rounded to bani, and the row is priced again from them so that it multiplies out; its value can move by a few bani.
- Works outside every object print as "Lucrări generale", and items outside every chapter as "Lucrări diverse".
- The client's Deviz lists the items as the Deviz's page numbers them, at their direct cost, then the Recapitulație with CAM, indirect costs, profit and VAT.
- The PDF library loads with the first export, not with the page, and the fonts come from `apps/app/public/fonts`, with the SIL Open Font License they are shipped under.
- Authorities number the forms differently, so each form's name can be changed before downloading. The choices made for an export are not kept yet; keeping them with the Deviz needs a field in the schema.
