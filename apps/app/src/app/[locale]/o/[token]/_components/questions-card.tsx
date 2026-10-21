"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { AIMeta } from "@devize/ui/ai-suggestion";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from "react";
import { useScopedI18n } from "@/locales/client";
import type { Choice, OpenOfferView } from "./types";
import { useOfferError } from "./use-offer-error";

type Question = FunctionReturnType<typeof api.offers.questions.forLink>[number];

const MAX_QUESTION = 1000;

/**
 * The client's questions about the Ofertă, with the assistant's answers from
 * it and the firm's replies. A question asks about the choice on screen.
 */
export function QuestionsCard({
  token,
  offer,
  choice,
}: {
  token: string;
  offer: OpenOfferView;
  choice: Choice;
}) {
  const t = useScopedI18n("offerPage.questions");
  const questions = useQuery(api.offers.questions.forLink, { token });
  const ask = useMutation(api.offers.questions.ask);
  const errorMessage = useOfferError();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const open = offer.state === "open";
  const canAsk = open && !offer.preview;
  const answering = questions?.some((q) => q.status === "answering") ?? false;
  const firm = offer.firm.name;

  if (questions === undefined || (!open && questions.length === 0)) {
    return null;
  }

  const send = async (question: string) => {
    if (!question.trim() || busy) {
      return;
    }
    setBusy(true);
    try {
      await ask({
        token,
        question,
        variantId: choice.variantId,
        excludedItemIds: choice.excludedItemIds,
      });
      setText("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(text);
  };
  // Ctrl or ⌘ with Enter sends, as in a chat; Enter alone starts a line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send(text);
    }
  };

  const suggestions = [
    t("suggest.price"),
    t("suggest.materials"),
    offer.variants.length > 0 ? t("suggest.variants") : t("suggest.overhead"),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="grid gap-4 pt-4">
        {open && (
          <p className="m-0 text-body text-ink-2">
            {offer.assistant
              ? t("hintAssistant", { firm })
              : t("hintFirm", { firm })}
          </p>
        )}
        {questions.length > 0 && (
          <ol className="m-0 grid list-none gap-5 p-0" aria-live="polite">
            {questions.map((question) => (
              <QuestionThread
                key={question._id}
                question={question}
                firm={firm}
              />
            ))}
          </ol>
        )}
        {canAsk && questions.length === 0 && (
          <div className="grid gap-2">
            <span className="text-meta text-ink-3">{t("suggestions")}</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void send(suggestion)}
                  className="h-auto min-h-7 whitespace-normal rounded-full py-1 text-left"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        {canAsk && (
          <form onSubmit={submit} className="grid gap-2">
            <label htmlFor="offer-question" className="sr-only">
              {t("label")}
            </label>
            <Textarea
              id="offer-question"
              value={text}
              rows={2}
              maxLength={MAX_QUESTION}
              placeholder={t("placeholder")}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-16 resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {offer.assistant && (
                <span className="min-w-0 flex-1 text-meta text-ink-3">
                  {t("disclaimer")}
                </span>
              )}
              <Button
                type="submit"
                disabled={busy || answering || !text.trim()}
                className="ml-auto"
              >
                {busy && <Icons.Loader className="animate-spin" aria-hidden />}
                {t("ask")}
              </Button>
            </div>
          </form>
        )}
        {open && offer.preview && (
          <p className="m-0 text-meta text-ink-3">{t("preview")}</p>
        )}
        {!open && <p className="m-0 text-meta text-ink-3">{t("closed")}</p>}
      </CardContent>
    </Card>
  );
}

/** One question, then the assistant's answer and the firm's reply. */
function QuestionThread({
  question,
  firm,
}: {
  question: Question;
  firm: string;
}) {
  const t = useScopedI18n("offerPage.questions");
  return (
    <li className="grid gap-2">
      <Bubble side="client" label={t("you")}>
        {question.question}
      </Bubble>
      {question.status === "answering" && (
        <Bubble side="assistant" label={t("assistant")}>
          <span className="inline-flex items-center gap-2 text-ink-2">
            <Icons.Loader className="size-4 animate-spin" aria-hidden />
            {t("answering")}
          </span>
        </Bubble>
      )}
      {question.answer && (
        <Bubble side="assistant" label={t("assistant")}>
          {question.answer}
        </Bubble>
      )}
      {question.reply && (
        <Bubble side="firm" label={firm}>
          {question.reply}
        </Bubble>
      )}
      {question.status === "waiting" && !question.reply && (
        <p className="m-0 text-meta text-ink-3">{t("waiting", { firm })}</p>
      )}
    </li>
  );
}

function Bubble({
  side,
  label,
  children,
}: {
  side: "client" | "assistant" | "firm";
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid max-w-[88%] gap-1",
        side === "client" ? "justify-self-end" : "justify-self-start",
      )}
    >
      {side === "assistant" ? (
        <AIMeta className="inline-flex items-center gap-1.5">
          <Icons.AI className="size-3.5" aria-hidden />
          {label}
        </AIMeta>
      ) : (
        <span
          className={cn(
            "text-meta text-ink-3",
            side === "client" && "justify-self-end",
          )}
        >
          {label}
        </span>
      )}
      <div
        className={cn(
          "whitespace-pre-line break-words rounded-lg px-3.5 py-2.5 text-body",
          side === "client" && "rounded-tr-sm bg-tile text-ink",
          side === "assistant" &&
            "rounded-tl-sm border border-ai-border bg-ai-soft text-ink",
          side === "firm" &&
            "rounded-tl-sm border border-border bg-card text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}
