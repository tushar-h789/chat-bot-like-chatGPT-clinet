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

  it("rejects a missing API base URL", () => {
    expect(() => readPublicEnv({})).toThrow();
  });
});
