import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { readPublicEnv } from "@/config/public-env";

type CsrfResponse = {
  csrf_token: string;
};

const SAFE_METHODS = new Set(["get", "head", "options"]);

export function createApiClient(baseUrl: string): AxiosInstance {
  const client = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    headers: { Accept: "application/json" },
  });

  let csrfToken: string | null = null;
  let pendingCsrf: Promise<string> | null = null;

  async function csrfTokenForWrite(): Promise<string> {
    if (csrfToken) {
      return csrfToken;
    }
    if (!pendingCsrf) {
      pendingCsrf = client
        .get<CsrfResponse>("/api/v1/auth/csrf")
        .then((response) => {
          csrfToken = response.data.csrf_token;
          return csrfToken;
        })
        .finally(() => {
          pendingCsrf = null;
        });
    }
    return pendingCsrf;
  }

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const method = (config.method ?? "get").toLowerCase();
      if (SAFE_METHODS.has(method)) {
        return config;
      }
      config.headers.set("X-CSRF-Token", await csrfTokenForWrite());
      return config;
    },
  );

  return client;
}

let apiClient: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = createApiClient(
      readPublicEnv({
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      }).NEXT_PUBLIC_API_BASE_URL,
    );
  }
  return apiClient;
}
