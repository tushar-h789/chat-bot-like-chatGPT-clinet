import { describe, expect, it } from "vitest";

import { toolLabel } from "@/features/chat/tools";

describe("toolLabel", () => {
  it("names the built-in tools", () => {
    expect(toolLabel("calculate")).toBe("Calculate");
    expect(toolLabel("current_time")).toBe("Current time");
    expect(toolLabel("other")).toBe("other");
  });
});