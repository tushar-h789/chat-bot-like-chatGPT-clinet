"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  bundledLanguages,
  codeToHtml,
  type BundledLanguage,
} from "shiki/bundle/web";

import { closeDanglingFence } from "@/features/chat/markdown";

type AssistantMarkdownProps = {
  text: string;
};

function supportedLanguage(language: string): BundledLanguage | null {
  if (language in bundledLanguages) {
    return language as BundledLanguage;
  }
  return null;
}

function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [highlighted, setHighlighted] = useState<{
    code: string;
    html: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const lang = supportedLanguage(language);

  useEffect(() => {
    if (!lang) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void codeToHtml(code, { lang, theme: "github-dark" })
        .then((html) => {
          if (active) {
            setHighlighted({ code, html });
          }
        })
        .catch(() => {
          if (active) {
            setHighlighted(null);
          }
        });
    }, 40);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [code, lang]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const html = highlighted?.code === code ? highlighted.html : null;

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-white/10">
      <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
        <span>{language || "text"}</span>
        <button
          className="rounded-md px-2 py-0.5 hover:bg-white/10 hover:text-zinc-100"
          type="button"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {html ? (
        <div
          className="overflow-x-auto text-sm [&_pre]:m-0 [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto bg-zinc-950 p-4 text-sm text-zinc-100">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export function AssistantMarkdown({ text }: AssistantMarkdownProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const value = String(children).replace(/\n$/, "");
            const language = /language-([\w+-]+)/.exec(className ?? "")?.[1];
            const block = Boolean(language) || value.includes("\n");
            if (!block) {
              return <code>{children}</code>;
            }
            return (
              <HighlightedCode code={value} language={language ?? "text"} />
            );
          },
        }}
      >
        {closeDanglingFence(text)}
      </ReactMarkdown>
    </div>
  );
}
