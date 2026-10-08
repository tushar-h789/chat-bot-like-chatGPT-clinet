import { getApiClient } from "@/lib/api/client";

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  replies: number;
  total_tokens: number;
};

export type AdminStats = {
  total_users: number;
  active_sessions: number;
  users_with_usage: number;
  replies: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tokens_today: number;
  users: AdminUserRow[];
};

export async function getAdminStats(): Promise<AdminStats> {
  const response = await getApiClient().get<AdminStats>("/api/v1/admin/stats");
  return response.data;
}