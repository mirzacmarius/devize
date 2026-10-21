"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { AIMeta } from "@devize/ui/ai-suggestion";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { StatusPill } from "@devize/ui/status-pill";
import { Switch } from "@devize/ui/switch";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { type FormEvent, type ReactNode, useState } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { useRun } from "@/components/use-run";
import { appErrorOf } from "@/lib/errors";
import { formatDay, formatTime } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

type Question = FunctionReturnType<
  typeof api.offers.questions.forOffer
>[number];

const MAX_REPLY = 2000;

/**
 * The client's questions on a link, as the firm follows them: how many wait
 * for its answer, the dialog to answer them, and, while the link is live,
 * whether the assistant answers first.
 */
export function OfferQuestions({
  offerId,
  assistant,
  live,
}: {
  offerId: Id<"offers">;
  assistant: boolean;
  live: boolean;
}) {
  const t = useScopedI18n("offer.questions");
  const questions = useQuery(api.offers.questions.forOffer, { offerId });
  const setAssistant = useMutation(api.offers.offers.setAssistant);
  const run = useRun();
  const [open, setOpen] = useState(false);
  if (questions === undefined || (!live && questions.length === 0)) {
    return null;
  }
  const waiting = questions.filter((q) => q.status === "waiting").length;

  return (
    <div className="grid gap-2.5 rounded-md border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-medium text-ink">{t("title")}</span>
        {waiting > 0 && (
          <StatusPill tone="warning">
            {t("waiting", { count: waiting })}
          </StatusPill>
        )}
      </div>
      <span className="text-meta text-ink-2">
        {questions.length === 0
          ? t("none")
          : t("count", { count: questions.length })}
      </span>
      {questions.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant={waiting > 0 ? "default" : "outline"}
          className="justify-self-start"
          onClick={() => setOpen(true)}
        >
          {waiting > 0 ? t("answer") : t("open")}
        </Button>
      )}
      {live && (
        <div className="flex items-start gap-3 border-t border-border pt-2.5">
          <Switch
            id={`offer-assistant-${offerId}`}
            checked={assistant}
            className="mt-0.5"
            onCheckedChange={(on) =>
              void run(
                () => setAssistant({ offerId, assistant: on }),
                on ? t("assistantOn") : t("assistantOff"),
              )
            }
          />
          <label
            htmlFor={`offer-assistant-${offerId}`}
            className="grid cursor-pointer gap-0.5"
          >
            <span className="text-body text-ink">{t("assistant")}</span>
            <span className="text-meta text-ink-3">{t("assistantHint")}</span>
          </label>
        </div>
      )}
      <QuestionsDialog
        questions={questions}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function QuestionsDialog({
  questions,
  open,
  onClose,
}: {
  questions: Question[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("offer.questions");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <ol className="m-0 grid list-none gap-4 p-0">
          {questions.map((question) => (
            <QuestionItem key={question._id} question={question} />
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** A question with its answers, and the firm's reply box when it waits. */
function QuestionItem({ question }: { question: Question }) {
  const t = useScopedI18n("offer.questions");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const reply = useMutation(api.offers.questions.reply);
  const errorMessage = useErrorMessage();
  const waiting = question.status === "waiting";
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const at = (timestamp: number) =>
    t("at", {
      date: formatDay(timestamp, locale),
      time: formatTime(timestamp, locale),
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    setBusy(true);
    try {
      await reply({ questionId: question._id, reply: text });
      setText("");
      setWriting(false);
      setError(undefined);
      toast.success(t("replied"));
    } catch (caught) {
      setError(
        appErrorOf(caught)?.code === "invalid"
          ? t("replyInvalid")
          : errorMessage(caught),
      );
    }
    setBusy(false);
  };

  return (
    <li
      className={cn(
        "grid gap-3 rounded-md border px-4 py-3",
        waiting ? "border-warning/40 bg-warning-soft" : "border-border",
      )}
    >
      <Entry label={t("client")} time={at(question._creationTime)}>
        {question.question}
      </Entry>
      {question.status === "answering" && (
        <AIMeta className="inline-flex items-center gap-1.5">
          <Icons.Loader className="size-3.5 animate-spin" aria-hidden />
          {t("answering")}
        </AIMeta>
      )}
      {question.answer && (
        <Entry
          label={t("assistantLabel")}
          time={question.answeredAt ? at(question.answeredAt) : undefined}
          ai
        >
          {question.answer}
        </Entry>
      )}
      {question.reply && (
        <Entry
          label={question.repliedByName ?? t("firm")}
          time={question.repliedAt ? at(question.repliedAt) : undefined}
        >
          {question.reply}
        </Entry>
      )}
      {waiting || writing ? (
        <form onSubmit={submit} className="grid gap-2">
          <label
            htmlFor={`reply-${question._id}`}
            className="text-meta font-medium text-ink"
          >
            {waiting ? t("waitingYou") : t("reply")}
          </label>
          <Textarea
            id={`reply-${question._id}`}
            value={text}
            maxLength={MAX_REPLY}
            placeholder={t("replyPlaceholder")}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setText(event.target.value);
              setError(undefined);
            }}
          />
          {error && <p className="m-0 text-meta text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy || !text.trim()}>
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("send")}
            </Button>
            {!waiting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setWriting(false);
                  setText("");
                  setError(undefined);
                }}
              >
                {tc("cancel")}
              </Button>
            )}
          </div>
        </form>
      ) : (
        question.status === "answered" && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="justify-self-start px-0 text-meta"
            onClick={() => {
              setText(question.reply ?? "");
              setWriting(true);
            }}
          >
            {question.reply ? t("editReply") : t("addReply")}
          </Button>
        )
      )}
    </li>
  );
}

function Entry({
  label,
  time,
  ai,
  children,
}: {
  label: string;
  time?: string;
  ai?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      {ai ? (
        <AIMeta className="inline-flex items-center gap-1.5">
          <Icons.AI className="size-3.5" aria-hidden />
          {time ? `${label} · ${time}` : label}
        </AIMeta>
      ) : (
        <span className="text-meta text-ink-3">
          {time ? `${label} · ${time}` : label}
        </span>
      )}
      <p className="m-0 whitespace-pre-line break-words text-body text-ink">
        {children}
      </p>
    </div>
  );
}
