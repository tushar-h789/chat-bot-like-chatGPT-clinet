import axios from "axios";
import { describe, expect, it } from "vitest";

import { createApiClient } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";

describe("createApiClient", () => {
  it("sends one csrf token on later writes", async () => {
    const client = createApiClient("http://localhost:8000");
    let csrfCalls = 0;
    const seenTokens: Array<string | undefined> = [];

    client.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.includes("/auth/csrf")) {
        csrfCalls += 1;
        return {
          data: { csrf_token: "csrf-test-token" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      const header = config.headers.get("X-CSRF-Token");
      seenTokens.push(typeof header === "string" ? header : undefined);
      return {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    await client.post("/api/v1/auth/login", { email: "a@example.com" });
    await client.post("/api/v1/auth/logout");

    expect(csrfCalls).toBe(1);
    expect(seenTokens).toEqual(["csrf-test-token", "csrf-test-token"]);
  });
});

describe("apiErrorMessage", () => {
  it("reads the API error message", () => {
    const error = new axios.AxiosError("Request failed");
    error.response = {
      data: {
        error: {
          code: "invalid_credentials",
          message: "Invalid email or password.",
        },
      },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };

    expect(apiErrorMessage(error)).toBe("Invalid email or password.");
  });
});
