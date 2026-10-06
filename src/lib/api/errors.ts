import axios from "axios";

import type { ApiErrorBody } from "@/lib/api/types";

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  if (error instanceof Error && error.message) {
    if (/^(network error|failed to fetch|load failed)$/i.test(error.message)) {
      return "The model could not be reached. Try again.";
    }
    return error.message;
  }
  return "Something went wrong.";
}
