type RecognitionAlternative = { transcript: string };

type RecognitionResult = {
  isFinal: boolean;
  [index: number]: RecognitionAlternative;
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = { error: string };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => Recognition;

export type Dictation = {
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

let speechGeneration = 0;

export function spokenText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function voiceInputMessage(code: string): string | null {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "The microphone is blocked.";
  }
  if (code === "audio-capture") {
    return "No microphone was found.";
  }
  if (code === "network") {
    return "Voice input could not be reached.";
  }
  if (code === "aborted" || code === "no-speech") {
    return null;
  }
  return "Voice input failed.";
}

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const host = window as SpeechWindow;
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function startDictation(handlers: {
  onChange: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): Dictation | null {
  const Ctor = recognitionConstructor();
  if (Ctor === null) {
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = navigator.language || "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  let finals = "";
  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const piece = result?.[0]?.transcript ?? "";
      if (result?.isFinal) {
        finals += piece;
      } else {
        interim += piece;
      }
    }
    handlers.onChange(`${finals}${interim}`.replace(/\s+/g, " ").trim());
  };
  recognition.onerror = (event) => {
    const message = voiceInputMessage(event.error);
    if (message) {
      handlers.onError(message);
    }
  };
  recognition.onend = () => {
    handlers.onEnd();
  };
  try {
    recognition.start();
  } catch {
    handlers.onError("Voice input failed.");
    return null;
  }
  return {
    stop: () => {
      recognition.stop();
    },
  };
}

export function speak(text: string, onEnd: () => void): "started" | "unavailable" | "empty" {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return "unavailable";
  }
  const spoken = spokenText(text);
  if (!spoken) {
    return "empty";
  }
  const mine = speechGeneration + 1;
  speechGeneration = mine;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = navigator.language || "en-US";
  const finish = () => {
    if (mine === speechGeneration) {
      onEnd();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
  return "started";
}

export function stopSpeaking(): void {
  speechGeneration += 1;
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
}
