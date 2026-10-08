"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { APP_NAME } from "@/config/brand";
import { AuthScreen } from "@/features/auth/auth-screen";
import { ChatScreen } from "@/features/chat/chat-screen";
import { fetchCurrentUser, login, register } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errors";

export function AppShell() {
  const queryClient = useQueryClient();
  const currentUser = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
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
        <p className="text-sm text-zinc-400">Loading</p>
      </main>
    );
  }

  if (currentUser.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-3 text-sm text-red-300" role="alert">
          {apiErrorMessage(currentUser.error)} The API must be running at the
          address in NEXT_PUBLIC_API_BASE_URL.
        </p>
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

  return <ChatScreen user={currentUser.data} />;
}
