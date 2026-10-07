import { describe, expect, it } from "vitest";

import { readPublicEnv } from "@/config/public-env";

describe("readPublicEnv", () => {
  it("accepts an absolute API base URL", () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000",
      }),
    ).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000",
    });
  });

  it("uses the current origin when the API base URL is omitted", () => {
    expect(readPublicEnv({})).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "",
    });
  });

  it("treats a placeholder API base URL as the current origin", () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "undefined",
      }),
    ).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "",
    });
  });
});
