import { afterEach, describe, expect, it } from "vitest";

import { speak, spokenText, startDictation, voiceInputMessage } from "@/features/chat/voice";

describe("spokenText", () => {
  it("drops code fences and keeps the words around them", () => {
    expect(spokenText("See\n```ts\nconst n = 1\n```\nthis")).toBe("See this");
  });

  it("reads link text and drops the address", () => {
    expect(spokenText("Open [Python](https://www.python.org) now")).toBe(
      "Open Python now",
    );
  });

  it("drops heading marks", () => {
    expect(spokenText("## Ready\n\n**Done**")).toBe("Ready Done");
  });
});

describe("voiceInputMessage", () => {
  it("stays quiet when the user stops or says nothing", () => {
    expect(voiceInputMessage("aborted")).toBeNull();
    expect(voiceInputMessage("no-speech")).toBeNull();
  });

  it("names a blocked microphone", () => {
    expect(voiceInputMessage("not-allowed")).toBe("The microphone is blocked.");
  });
});

describe("startDictation", () => {
  afterEach(() => {
    delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it("returns null when the browser has no speech recognition", () => {
    expect(startDictation({ onChange: () => {}, onEnd: () => {}, onError: () => {} })).toBeNull();
  });

  it("writes the transcript and stops on request", () => {
    const seen: string[] = [];
    let ended = false;
    const recognition = {
      lang: "",
      continuous: false,
      interimResults: false,
      onresult: null as ((event: unknown) => void) | null,
      onerror: null as ((event: { error: string }) => void) | null,
      onend: null as (() => void) | null,
      start() {},
      stop() {
        this.onend?.();
      },
    };
    (window as { SpeechRecognition?: new () => typeof recognition }).SpeechRecognition =
      class {
        constructor() {
          return recognition;
        }
      } as unknown as new () => typeof recognition;

    const session = startDictation({
      onChange: (text) => seen.push(text),
      onEnd: () => {
        ended = true;
      },
      onError: () => {},
    });

    recognition.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: "hello there" } }],
    });
    session?.stop();

    expect(seen).toEqual(["hello there"]);
    expect(ended).toBe(true);
    expect(recognition.lang).toBe(navigator.language || "en-US");
  });
});

describe("speak", () => {
  it("reports that speech output is missing", () => {
    const original = window.speechSynthesis;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });

    expect(speak("Hello", () => {})).toBe("unavailable");

    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: original });
  });
});
