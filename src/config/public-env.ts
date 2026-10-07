import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.union([z.url(), z.literal("")]),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return "";
  }
  return trimmed;
}

export function readPublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: normalizeApiBaseUrl(
      source.NEXT_PUBLIC_API_BASE_URL,
    ),
  });
  if (parsed.success) {
    return parsed.data;
  }
  return { NEXT_PUBLIC_API_BASE_URL: "" };
}
