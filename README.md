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

The dev server runs at http://localhost:3000.

Chat, authentication, and streaming are later phases. The home page only confirms the scaffold.
