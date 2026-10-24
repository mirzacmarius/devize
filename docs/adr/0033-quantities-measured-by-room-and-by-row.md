# Quantities are measured by room and by row, and the Antemăsurătoare prints with the Deviz

A Deviz's quantities were typed straight into its Articole. The `takeoffs` table kept the rows behind a quantity (count × length × width × height, with deductions) for Devize AI to fill from photos and plans, but nobody could see or write them in the app, and nothing tied a quantity to the room it came from. A contractor measures a site room by room, and one room feeds many Articole: its floor goes to the screed and the flooring, its walls less the doors and windows to the plaster and the paint, its perimeter to the skirting. Typing each of these by hand is where devize go wrong, and a client's or an authority's "where does 42,8 mp come from?" had no answer in the app.

## Camere

A Deviz has Camere (`rooms`): a name and a level, its length, width and height, or a floor area and a perimeter typed for an irregular shape, and its openings (doors, windows, other) with their count and size. From these `takeoffs/measures.ts` works out the floor, the ceiling, the walls with the openings deducted, the perimeter, the skirting (the perimeter less the doors and the other openings, since windows don't reach the floor), the openings' area and the doors and windows counted. The figures are worked out when read, never stored, so a room changed is a room right everywhere.

## Takeoffs

An Articol's Antemăsurătoare is one or more `takeoffs`, each a list of rows in metres and pieces, deductions marked, totalled in the Articol's unit: rows in mp are divided by 100 for an Articol in "100 mp". An Articol's quantity is the sum of its takeoffs' totals, written on every save and removal, so the Deviz and its Recapitulație follow at once; a quantity typed afterwards by hand shows as drifted, with one click to take the measured figure again. Rows are typed by hand, with "3,2+1,5" or "2*0,9" allowed in a dimension, or written from rooms: the person picks a measure that fits the Articol's unit (mp: floor, ceiling, walls, walls and ceiling, openings; m: perimeter, skirting; buc: doors, windows), guessed from the Articol's title, and the rooms it covers. Such a takeoff keeps its measure and its rooms (`takeoffs.rooms`, method `rooms`), rewrites its rows when a room changes and drops a room that is deleted, keeping its quantity; its rows edited by hand detach it from the rooms, and rows an AI wrote count as checked once a person saves them. A takeoff whose Articol was removed stays, to be linked to another Articol or deleted.

## Where it shows

The page `/estimates/[id]/takeoff` lists the rooms, each Articol with its takeoffs and what they measure against what the Deviz prices, and a summary; a card on the Deviz's page opens it and warns of drifted quantities, Articole not measured and takeoffs without an Articol. The Anexa Antemăsurătoare (`AM` in `@devize/forms`) prints the rooms with their measures and, by Articol with its number in the Deviz, every row, deduction and total, as a PDF or as a sheet of the Excel workbook; it downloads on its own, from the Documente card once something is measured and from the page.

## Consequences

- Nothing changes in a Deviz until someone measures: Articole keep their typed quantities, and a Deviz with no rooms and no takeoffs has no appendix.
- A revision copies the rooms and the takeoffs with its Articole, and deleting a Deviz deletes them; a sent Deviz's measurements are read-only like the rest of it.
- A Deviz holds at most 500 rooms with 50 openings each, an Articol 20 takeoffs of 200 rows; a side is at most 1 000 m. Totals are rounded to three decimals, rows to two.
- A room's measures are worked out in the app and in the appendix from the same module, so the two never differ.
- Devize AI's takeoffs (photo, plan, voice, derived) show with their method and count as unchecked until a person saves them.
