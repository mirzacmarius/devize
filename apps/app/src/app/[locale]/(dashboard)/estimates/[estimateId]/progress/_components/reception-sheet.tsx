"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatCalendarDate, formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Reception, ReceptionKind, Receptions, Works } from "./types";

type Person = Reception["people"][number];
type Role = Person["role"];
type Decision = NonNullable<Reception["decision"]> | "none";

const roles: readonly Role[] = [
  "president",
  "member",
  "secretary",
  "executant",
  "designer",
  "supervisor",
  "invited",
];

let nextKey = 1;
const keyed = <T,>(item: T) => {
  nextKey += 1;
  return { key: nextKey, ...item };
};

/**
 * What goes into a Proces-verbal de recepție: the works' identification,
 * the permit, the committee and when it sat, what it found, the objections
 * with their deadlines and what it proposes.
 */
export function ReceptionSheet({
  works,
  receptions,
  kind,
  onClose,
}: {
  works: Works;
  receptions: Receptions;
  kind: ReceptionKind | null;
  onClose: () => void;
}) {
  const t = useScopedI18n("progress.receptionSheet");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={kind !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="overflow-y-auto sm:max-w-xl"
      >
        {kind && (
          <>
            <SheetHeader>
              <SheetTitle>{t(`titles.${kind}`)}</SheetTitle>
              <SheetDescription>{t("description")}</SheetDescription>
            </SheetHeader>
            <ReceptionForm
              key={kind}
              works={works}
              receptions={receptions}
              kind={kind}
              onDone={onClose}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReceptionForm({
  works,
  receptions,
  kind,
  onDone,
}: {
  works: Works;
  receptions: Receptions;
  kind: ReceptionKind;
  onDone: () => void;
}) {
  const t = useScopedI18n("progress.receptionSheet");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const save = useMutation(api.progress.receptions.save);
  const reception = receptions[kind];
  const other = kind === "final" ? receptions.completion : null;
  const { suggested } = receptions;
  const [number, setNumber] = useState(reception?.number ?? "");
  const [date, setDate] = useState(reception?.date ?? todayInput());
  const [place, setPlace] = useState(reception?.place ?? "");
  const [contractNumber, setContractNumber] = useState(
    reception?.contract?.number ?? other?.contract?.number ?? "",
  );
  const [contractDate, setContractDate] = useState(
    reception?.contract?.date ?? other?.contract?.date ?? "",
  );
  const [permitNumber, setPermitNumber] = useState(
    reception?.permit?.number ?? other?.permit?.number ?? "",
  );
  const [permitIssuer, setPermitIssuer] = useState(
    reception?.permit?.issuer ?? other?.permit?.issuer ?? "",
  );
  const [permitDate, setPermitDate] = useState(
    reception?.permit?.date ?? other?.permit?.date ?? "",
  );
  const [permitValidUntil, setPermitValidUntil] = useState(
    reception?.permit?.validUntil ?? other?.permit?.validUntil ?? "",
  );
  const [executionStart, setExecutionStart] = useState(
    reception?.executionStart ??
      other?.executionStart ??
      suggested.executionStart ??
      "",
  );
  const [executionEnd, setExecutionEnd] = useState(
    reception?.executionEnd ??
      other?.executionEnd ??
      suggested.executionEnd ??
      "",
  );
  const [committeeStart, setCommitteeStart] = useState(
    reception?.committeeStart ?? "",
  );
  const [committeeEnd, setCommitteeEnd] = useState(
    reception?.committeeEnd ?? "",
  );
  const [warrantyMonths, setWarrantyMonths] = useState(
    reception?.warrantyMonths !== undefined
      ? String(reception.warrantyMonths)
      : other?.warrantyMonths !== undefined
        ? String(other.warrantyMonths)
        : "",
  );
  const [copies, setCopies] = useState(
    reception?.copies !== undefined ? String(reception.copies) : "3",
  );
  const [people, setPeople] = useState(() =>
    (reception?.people ?? other?.people ?? []).map((person) =>
      keyed({ ...person, organization: person.organization ?? "" }),
    ),
  );
  const [findings, setFindings] = useState(reception?.findings ?? "");
  const [objections, setObjections] = useState(() =>
    (reception?.objections ?? []).map((objection) =>
      keyed({ text: objection.text, deadline: objection.deadline ?? "" }),
    ),
  );
  const [decision, setDecision] = useState<Decision>(
    reception?.decision ?? "none",
  );
  const [reasons, setReasons] = useState(reception?.reasons ?? "");
  const [measures, setMeasures] = useState(reception?.measures ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const changePerson = (key: number, patch: Partial<Person>) =>
    setPeople((current) =>
      current.map((person) =>
        person.key === key ? { ...person, ...patch } : person,
      ),
    );
  const changeObjection = (
    key: number,
    patch: Partial<{ text: string; deadline: string }>,
  ) =>
    setObjections((current) =>
      current.map((objection) =>
        objection.key === key ? { ...objection, ...patch } : objection,
      ),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date) {
      setError(t("invalidDate"));
      return;
    }
    if (people.some((person) => !person.name.trim())) {
      setError(t("invalidPeople"));
      return;
    }
    if (objections.some((objection) => !objection.text.trim())) {
      setError(t("invalidObjections"));
      return;
    }
    const months = warrantyMonths.trim() ? Number(warrantyMonths) : undefined;
    const count = copies.trim() ? Number(copies) : undefined;
    if (
      (months !== undefined && !Number.isInteger(months)) ||
      (count !== undefined && !Number.isInteger(count))
    ) {
      setError(t("invalidNumber"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        save({
          estimateId: works._id,
          kind,
          number: number.trim() || undefined,
          date,
          place: place.trim() || undefined,
          contract: contractNumber.trim()
            ? {
                number: contractNumber.trim(),
                date: contractDate || undefined,
              }
            : undefined,
          permit: permitNumber.trim()
            ? {
                number: permitNumber.trim(),
                issuer: permitIssuer.trim() || undefined,
                date: permitDate || undefined,
                validUntil: permitValidUntil || undefined,
              }
            : undefined,
          executionStart: executionStart || undefined,
          executionEnd: executionEnd || undefined,
          committeeStart: committeeStart || undefined,
          committeeEnd: committeeEnd || undefined,
          warrantyMonths: months,
          people: people.map((person) => ({
            name: person.name.trim(),
            role: person.role,
            organization: person.organization.trim() || undefined,
          })),
          findings: findings.trim() || undefined,
          objections: objections.map((objection) => ({
            text: objection.text.trim(),
            deadline: objection.deadline || undefined,
          })),
          decision: decision === "none" ? undefined : decision,
          reasons: reasons.trim() || undefined,
          measures: measures.trim() || undefined,
          copies: count,
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  const section = "text-label uppercase text-ink-3";

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("number")} htmlFor="reception-number">
          <Input
            id="reception-number"
            value={number}
            maxLength={50}
            onChange={(event) => setNumber(event.target.value)}
          />
        </Field>
        <Field label={t("date")} htmlFor="reception-date">
          <Input
            id="reception-date"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label={t("place")} htmlFor="reception-place">
          <Input
            id="reception-place"
            value={place}
            maxLength={200}
            onChange={(event) => setPlace(event.target.value)}
          />
        </Field>
      </div>

      <span className={section}>{t("contract")}</span>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("contractNumber")} htmlFor="reception-contract">
          <Input
            id="reception-contract"
            value={contractNumber}
            maxLength={100}
            onChange={(event) => setContractNumber(event.target.value)}
          />
        </Field>
        <Field label={t("contractDate")} htmlFor="reception-contract-date">
          <Input
            id="reception-contract-date"
            type="date"
            value={contractDate}
            onChange={(event) => setContractDate(event.target.value)}
          />
        </Field>
      </div>

      <span className={section}>{t("permit")}</span>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("permitNumber")}
          htmlFor="reception-permit"
          hint={t("permitHint")}
        >
          <Input
            id="reception-permit"
            value={permitNumber}
            maxLength={100}
            onChange={(event) => setPermitNumber(event.target.value)}
          />
        </Field>
        <Field label={t("permitIssuer")} htmlFor="reception-permit-issuer">
          <Input
            id="reception-permit-issuer"
            value={permitIssuer}
            maxLength={200}
            onChange={(event) => setPermitIssuer(event.target.value)}
          />
        </Field>
        <Field label={t("permitDate")} htmlFor="reception-permit-date">
          <Input
            id="reception-permit-date"
            type="date"
            value={permitDate}
            onChange={(event) => setPermitDate(event.target.value)}
          />
        </Field>
        <Field label={t("permitValidUntil")} htmlFor="reception-permit-valid">
          <Input
            id="reception-permit-valid"
            type="date"
            value={permitValidUntil}
            onChange={(event) => setPermitValidUntil(event.target.value)}
          />
        </Field>
      </div>

      <span className={section}>{t("execution")}</span>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("executionStart")} htmlFor="reception-execution-start">
          <Input
            id="reception-execution-start"
            type="date"
            value={executionStart}
            onChange={(event) => setExecutionStart(event.target.value)}
          />
        </Field>
        <Field label={t("executionEnd")} htmlFor="reception-execution-end">
          <Input
            id="reception-execution-end"
            type="date"
            value={executionEnd}
            onChange={(event) => setExecutionEnd(event.target.value)}
          />
        </Field>
      </div>
      <p className="m-0 text-meta text-ink-3">
        {suggested.executionStart && suggested.executionEnd
          ? `${t("fromStatements", {
              start: formatCalendarDate(suggested.executionStart, locale),
              end: formatCalendarDate(suggested.executionEnd, locale),
            })} `
          : ""}
        {t("value", {
          amount: formatMoney(reception?.value ?? suggested.value, locale),
        })}
      </p>

      <span className={section}>{t("committee")}</span>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("committeeStart")} htmlFor="reception-committee-start">
          <Input
            id="reception-committee-start"
            type="date"
            value={committeeStart}
            onChange={(event) => setCommitteeStart(event.target.value)}
          />
        </Field>
        <Field label={t("committeeEnd")} htmlFor="reception-committee-end">
          <Input
            id="reception-committee-end"
            type="date"
            value={committeeEnd}
            onChange={(event) => setCommitteeEnd(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-body text-ink">{t("people")}</span>
        {people.map((person, index) => (
          <div
            key={person.key}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto]"
          >
            <Input
              aria-label={t("personName")}
              placeholder={t("personName")}
              value={person.name}
              maxLength={120}
              onChange={(event) =>
                changePerson(person.key, { name: event.target.value })
              }
            />
            <Select
              value={person.role}
              onValueChange={(role) =>
                changePerson(person.key, { role: role as Role })
              }
            >
              <SelectTrigger aria-label={t("personRole")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`roles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label={t("personOrganization")}
              placeholder={t("personOrganization")}
              value={person.organization}
              maxLength={200}
              onChange={(event) =>
                changePerson(person.key, { organization: event.target.value })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-ink-3"
              aria-label={t("removePerson", { index: index + 1 })}
              onClick={() =>
                setPeople((current) =>
                  current.filter((item) => item.key !== person.key),
                )
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={people.length >= 30}
          onClick={() =>
            setPeople((current) => [
              ...current,
              keyed({
                name: "",
                role: (current.length === 0 ? "president" : "member") as Role,
                organization: "",
              }),
            ])
          }
        >
          {t("addPerson")}
        </Button>
      </div>

      <Field label={t("findings")} htmlFor="reception-findings">
        <Textarea
          id="reception-findings"
          value={findings}
          rows={4}
          maxLength={3000}
          onChange={(event) => setFindings(event.target.value)}
        />
      </Field>

      <div className="grid gap-2">
        <span className="text-body text-ink">{t("objections")}</span>
        {objections.map((objection, index) => (
          <div
            key={objection.key}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
          >
            <Input
              aria-label={t("objectionText")}
              placeholder={t("objectionText")}
              value={objection.text}
              maxLength={1000}
              onChange={(event) =>
                changeObjection(objection.key, { text: event.target.value })
              }
            />
            <Input
              type="date"
              aria-label={t("objectionDeadline")}
              value={objection.deadline}
              onChange={(event) =>
                changeObjection(objection.key, {
                  deadline: event.target.value,
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-ink-3"
              aria-label={t("removeObjection", { index: index + 1 })}
              onClick={() =>
                setObjections((current) =>
                  current.filter((item) => item.key !== objection.key),
                )
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={objections.length >= 50}
          onClick={() =>
            setObjections((current) => [
              ...current,
              keyed({ text: "", deadline: "" }),
            ])
          }
        >
          {t("addObjection")}
        </Button>
      </div>

      <Field label={t("decision")}>
        <SegmentedControl
          label={t("decision")}
          value={decision}
          options={[
            { value: "none", label: t("noDecision") },
            { value: "admitted", label: t("decisions.admitted") },
            { value: "postponed", label: t("decisions.postponed") },
            { value: "rejected", label: t("decisions.rejected") },
          ]}
          onChange={setDecision}
        />
      </Field>
      {decision !== "admitted" && (
        <Field label={t("reasons")} htmlFor="reception-reasons">
          <Textarea
            id="reception-reasons"
            value={reasons}
            rows={3}
            maxLength={3000}
            onChange={(event) => setReasons(event.target.value)}
          />
        </Field>
      )}
      <Field label={t("measures")} htmlFor="reception-measures">
        <Textarea
          id="reception-measures"
          value={measures}
          rows={3}
          maxLength={3000}
          onChange={(event) => setMeasures(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("warrantyMonths")} htmlFor="reception-warranty">
          <Input
            id="reception-warranty"
            inputMode="numeric"
            value={warrantyMonths}
            onChange={(event) => setWarrantyMonths(event.target.value)}
          />
        </Field>
        <Field label={t("copies")} htmlFor="reception-copies">
          <Input
            id="reception-copies"
            inputMode="numeric"
            value={copies}
            onChange={(event) => setCopies(event.target.value)}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
