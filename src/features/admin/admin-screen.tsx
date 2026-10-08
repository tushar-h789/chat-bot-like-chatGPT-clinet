"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { APP_NAME } from "@/config/brand";
import { AuthScreen } from "@/features/auth/auth-screen";
import { getAdminStats } from "@/lib/api/admin";
import { fetchCurrentUser, login, register } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errors";
import { userIsAdmin } from "@/lib/api/types";

function formatWhen(value: string): string {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) {
    return value;
  }
  return when.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
      </p>
    </div>
  );
}

export function AdminScreen() {
  const queryClient = useQueryClient();
  const currentUser = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
  });
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
    enabled: userIsAdmin(currentUser.data),
  });

  const signIn = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });

  const signUp = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });

  if (currentUser.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Loading</p>
      </main>
    );
  }

  if (currentUser.isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900 p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p
            className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {apiErrorMessage(currentUser.error)}
          </p>
        </div>
      </main>
    );
  }

  if (!currentUser.data) {
    return (
      <AuthScreen
        onLogin={(email, password) =>
          signIn.mutateAsync({ email, password }).then(() => undefined)
        }
        onRegister={(email, password) =>
          signUp.mutateAsync({ email, password }).then(() => undefined)
        }
      />
    );
  }

  if (!userIsAdmin(currentUser.data)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900 p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-3 text-sm text-zinc-400" role="alert">
            Admin access is required.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center text-sm text-zinc-200 underline-offset-4 hover:underline"
          >
            Back to chat
          </Link>
        </div>
      </main>
    );
  }

  const data = stats.data;

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-zinc-500 uppercase">
              {APP_NAME}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Admin
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{currentUser.data.email}</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center text-sm text-zinc-200 underline-offset-4 hover:underline"
          >
            Back to chat
          </Link>
        </header>

        {stats.isLoading ? (
          <p className="text-sm text-zinc-500">Loading</p>
        ) : null}
        {stats.isError ? (
          <p
            className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {apiErrorMessage(stats.error)}
          </p>
        ) : null}

        {data ? (
          <>
            <section
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              aria-label="Totals"
            >
              <StatCard
                label="Accounts"
                value={data.total_users.toLocaleString("en-US")}
              />
              <StatCard
                label="Active sessions"
                value={data.active_sessions.toLocaleString("en-US")}
              />
              <StatCard
                label="Users who chatted"
                value={data.users_with_usage.toLocaleString("en-US")}
              />
              <StatCard
                label="Replies"
                value={data.replies.toLocaleString("en-US")}
              />
              <StatCard
                label="Total tokens"
                value={data.total_tokens.toLocaleString("en-US")}
              />
              <StatCard
                label="Tokens today"
                value={data.tokens_today.toLocaleString("en-US")}
              />
              <StatCard
                label="Input tokens"
                value={data.input_tokens.toLocaleString("en-US")}
              />
              <StatCard
                label="Output tokens"
                value={data.output_tokens.toLocaleString("en-US")}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <caption className="sr-only">Registered accounts</caption>
                  <thead className="bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Replies</th>
                      <th className="px-4 py-3 font-medium">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-zinc-500"
                          colSpan={5}
                        >
                          No accounts yet.
                        </td>
                      </tr>
                    ) : (
                      data.users.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-white/10"
                        >
                          <td className="px-4 py-3 break-all text-zinc-100">
                            {row.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                            {formatWhen(row.created_at)}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {row.is_admin ? "Admin" : "User"}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-zinc-300">
                            {row.replies.toLocaleString("en-US")}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-zinc-300">
                            {row.total_tokens.toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
