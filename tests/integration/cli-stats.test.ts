import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

describe("omh stats CLI", () => {
  it("omh stats --help shows description", () => {
    const bin = path.resolve("dist/bin/oh-my-harness.js");
    const output = execSync(`node ${bin} stats --help`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    expect(output).toContain("dashboard");
  });
});
