# AI Chatbot frontend

Next.js application. It will talk to the FastAPI backend. It never holds the OpenAI API key.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Commands

```bash
npm run dev
npm run lint
npm run format:check
npm test
npm run build
```

The dev server runs at http://localhost:3000. Open that host, not `127.0.0.1`, so the session cookie stays on `localhost` with the API.

The page signs in through the API, then lists, renames, and deletes conversations and saves messages. Model replies and streaming are later phases. The browser never receives the OpenAI key.
