import { getApiClient } from "@/lib/api/client";

export type UsageSummary = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  replies: number;
  cost_usd: string | null;
  tokens_today: number;
  daily_token_limit: number | null;
};

export async function getUsage(): Promise<UsageSummary> {
  const response = await getApiClient().get<UsageSummary>("/api/v1/usage");
  return response.data;
}
