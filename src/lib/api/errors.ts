import axios from "axios";

import type { ApiErrorBody } from "@/lib/api/types";

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  return "Something went wrong.";
}
