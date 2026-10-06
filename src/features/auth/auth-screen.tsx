"use client";

import { useState, type FormEvent } from "react";

import { apiErrorMessage } from "@/lib/api/errors";

type AuthMode = "login" | "register";

type AuthScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
};

export function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const submitLabel = mode === "login" ? "Sign in" : "Create account";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">AI Chatbot</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign in to keep your conversations on this account.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 outline-none focus:border-white/40"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 outline-none focus:border-white/40"
            type="password"
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className="text-xs text-zinc-500">
          Use 12 to 128 characters.
        </p>
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Please wait" : submitLabel}
        </button>
      </form>
      <button
        className="mt-4 text-sm text-zinc-300 underline-offset-4 hover:underline"
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
      >
        {mode === "login"
          ? "Need an account? Create one"
          : "Already registered? Sign in"}
      </button>
    </main>
  );
}
