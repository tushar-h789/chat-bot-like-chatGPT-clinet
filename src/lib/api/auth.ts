import axios from "axios";

import { getApiClient } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await getApiClient().get<User>("/api/v1/auth/me");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function register(email: string, password: string): Promise<User> {
  const response = await getApiClient().post<User>("/api/v1/auth/register", {
    email,
    password,
  });
  return response.data;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await getApiClient().post<User>("/api/v1/auth/login", {
    email,
    password,
  });
  return response.data;
}

export async function logout(): Promise<void> {
  await getApiClient().post("/api/v1/auth/logout");
}
