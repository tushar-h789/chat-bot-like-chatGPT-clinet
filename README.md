# Tushar-AI ChatBot frontend

Next.js application for a ChatGPT-style chat. It talks to the FastAPI backend and never holds the Gemini or OpenAI key.

The page rules are in [Business rules](#business-rules). The API repository documents the shared product rules.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- TanStack Query for server data, Zustand for sidebar and composer state
- Axios for JSON calls, with cookies. `fetch` plus `AbortController` for the chat stream
- Zod for request parsing
- `react-markdown`, `remark-gfm`, and Shiki for assistant replies
- Vitest and Testing Library

The interface is custom Tailwind. It does not use shadcn/ui.

## Business rules

Open the app at `http://localhost:3000`, not `127.0.0.1`, so the session cookie stays on `localhost` with the API.

### Session

The page signs in, registers, and logs out through the API. The browser stores no password and no model key. JSON writes send the CSRF header. Logout clears the cached usage and conversations.

### Chat

Send posts to `POST /api/v1/chat` and paints the reply as events arrive. Stop aborts that request. A sent reply stays after refresh.

Assistant text renders as Markdown. Fenced code is highlighted, and a code block has its own Copy. User messages stay plain text. Raw HTML from the model is not rendered. An empty finished assistant message shows `The model did not reply.`

A reply shows `Calculate` or `Current time` when the model called one of those functions, plus the result the server returned.

Search stays on until it is turned off. The next messages then ask for web search. A user bubble shows `Web` when that message did.

Regenerate is shown only on the latest assistant message, including an empty one, and only while nothing is streaming. It replaces that reply in place.

### Attachments

Attach uploads the file before send. One message can include up to 4 files. The composer says when the model will read attached text, images, or PDFs. The saved bubble keeps the typed text and the file names.

### Voice

Mic writes speech into the composer with the browser Web Speech API. Speak reads one assistant reply with speech synthesis. Neither uploads audio or starts a model call. Send, regenerate, and switching conversation stop both. If the browser has no speech API, the page says voice input is not available.

### Usage

When the API returns a daily cap, the sidebar shows today's tokens against that cap, for example `1,556 / 100,000 tokens today`. The count refreshes after a reply finishes. A cap of zero means the API omits the limit, and the sidebar hides the line.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

`.env.local` needs the API origin:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Commands

```bash
npm run dev
npm run lint
npm run format:check
npm test
npm run build
```

`npm run dev` serves http://localhost:3000. The API must already be running. `compose.prod.yaml` builds this web app and is not started from here. `.github/workflows/ci.yml` tests, typechecks, and lints this repository.
