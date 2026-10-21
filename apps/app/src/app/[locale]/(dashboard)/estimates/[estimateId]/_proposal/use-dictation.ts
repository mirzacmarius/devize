"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API, which Chrome, Edge and Safari offer and TypeScript's
// DOM types leave out. Only what dictation uses.
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionClass(): (new () => Recognition) | undefined {
  const speech = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

/**
 * Dictation where the browser offers it: each phrase goes to `onPhrase` once
 * the browser is sure of it, and `interim` shows the one still being heard.
 */
export function useDictation(lang: string, onPhrase: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [failed, setFailed] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const phrase = useRef(onPhrase);

  useEffect(() => {
    phrase.current = onPhrase;
  });
  useEffect(() => {
    setSupported(recognitionClass() !== undefined);
    return () => recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Speech = recognitionClass();
    if (!Speech || recognition.current) {
      return;
    }
    const session = new Speech();
    session.lang = lang;
    session.continuous = true;
    session.interimResults = true;
    session.onresult = (event) => {
      let heard = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) {
          continue;
        }
        if (result.isFinal) {
          phrase.current(result[0].transcript.trim());
        } else {
          heard += result[0].transcript;
        }
      }
      setInterim(heard.trim());
    };
    session.onerror = (event) => {
      // Silence ends a session on its own; anything else is worth saying.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setFailed(true);
      }
    };
    session.onend = () => {
      recognition.current = null;
      setListening(false);
      setInterim("");
    };
    recognition.current = session;
    setFailed(false);
    setListening(true);
    try {
      session.start();
    } catch {
      recognition.current = null;
      setListening(false);
      setFailed(true);
    }
  }, [lang]);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, interim, failed, start, stop };
}
