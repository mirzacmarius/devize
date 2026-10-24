// A Deviz under execution as documents: the Situație de lucrări of a period
// with its Atașament, and the two Procese-verbale de recepție. Builders turn
// the app's rows into blocks; `@devize/forms/pdf` and `@devize/forms/xlsx`
// draw them like any other form.

export type {
  AttachmentRow,
  ReceptionData,
  ReceptionInput,
  ReceptionPerson,
  StatementData,
  StatementInput,
  StatementOptions,
  StatementRowInput,
  WorksInput,
} from "./input";
export { receptionDocument } from "./reception";
export {
  attachmentDocument,
  statementDocument,
  statementDocuments,
} from "./statement";
