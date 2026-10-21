# Documents written as an Excel workbook too

Some contracting authorities ask for the financial offer's forms in a format they can edit, beside the signed PDF. A Firmă may want to send a client its Deviz in Excel, and a person may want to sort a list or add it up without typing it again. So the documents a Deviz makes also download as one .xlsx workbook. It is made from the same blocks and tables the PDF draws (ADR 0009), in the browser like the PDF, by `packages/forms/src/xlsx`, with each document on a sheet of its own. The forms sheet and the client's Deviz have an Excel button beside the PDF one.

## Consequences

- A sheet's columns are those of its document's widest table, as wide as in the PDF. The other blocks span them: the parties' lines, the title, the text and the signatures.
- A table with fewer columns keeps its first and last columns on the sheet's, and its widest column takes the ones left over. So the months of a schedule's shorter last year sit beside its total. A narrower table, such as the client Deviz's Recapitulație, takes the columns under it.
- Amounts and quantities are numbers, shown with the decimals the PDF prints, so they can be added up and copied. The totals are the PDF's values, not formulas, so a sheet shows the same numbers as the PDF, rounding included.
- Each sheet prints on A4 in its PDF's orientation, fitted to the page's width.
  - Its long table's header repeats on every page.
  - The form's name is at the top, and each page has the PDF's footer and its own number.
  - Text and widths are a quarter larger than in the PDF, which reads well on a screen and prints at the PDF's size.
- Neither Excel nor LibreOffice fits a row to a merged cell's text. So a row holding one gets a height worked out from Arial's widths, with a little room to spare. Other rows fit themselves when the file opens.
- Sheets are named after their form, such as F3 · 01 Terasamente. A name is cut to Excel's 31 characters, and gets a number when two would be the same.
- fflate writes the workbook, as it does the authority's lists (ADR 0023). It loads with the first export.
