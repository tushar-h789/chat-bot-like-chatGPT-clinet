"use client";

import { useState, type FormEvent } from "react";

import { APP_NAME } from "@/config/brand";
import { BrandMark } from "@/features/auth/brand-mark";
import { EyeIcon, EyeOffIcon } from "@/features/chat/ui/icons";
import { apiErrorMessage } from "@/lib/api/errors";

type AuthMode = "login" | "register";

type AuthScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-white/15 bg-zinc-950 px-3.5 text-base text-zinc-50 placeholder:text-zinc-500 transition-colors hover:border-white/30 focus:border-white/55 focus:bg-zinc-900 focus:outline-none";

export function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setShowPassword(false);
  }

  const isLogin = mode === "login";
  const submitLabel = isLogin ? "Sign in" : "Create account";
  const passwordHint =
    password.length > 0 && password.length < 12
      ? `${12 - password.length} more characters needed`
      : "Use 12 to 128 characters.";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {APP_NAME}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {isLogin
                ? "Welcome back. Sign in to continue your conversations."
                : "Create an account to save your chats and continue later."}
            </p>
          </div>
        </div>

        <div
          className="mt-6 grid grid-cols-2 rounded-xl bg-zinc-950 p-1"
          role="tablist"
          aria-label="Account"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`h-10 rounded-lg text-sm font-medium transition-colors ${
              isLogin
                ? "bg-white text-zinc-950"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
            onClick={() => switchMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`h-10 rounded-lg text-sm font-medium transition-colors ${
              !isLogin
                ? "bg-white text-zinc-950"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
            onClick={() => switchMode("register")}
          >
            Create account
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm text-zinc-400">
            Email
            <input
              className={`${fieldClass} mt-1.5`}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Password
            <span className="relative mt-1.5 block">
              <input
                className={`${fieldClass} pr-12`}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={12}
                maxLength={128}
                placeholder={isLogin ? "Your password" : "At least 12 characters"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>
          <p
            className={`text-xs ${
              !isLogin && password.length > 0 && password.length < 12
                ? "text-amber-300"
                : "text-zinc-500"
            }`}
          >
            {!isLogin && password.length > 0 && password.length < 12
              ? passwordHint
              : "Use 12 to 128 characters."}
          </p>
          {error ? (
            <p
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <button
            className="h-12 w-full rounded-xl bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 active:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            type="submit"
            disabled={pending}
          >
            {pending ? "Please wait" : submitLabel}
          </button>
        </form>
      </div>
    </main>
  );
}
