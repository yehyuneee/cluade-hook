import { describe, it, expect } from "vitest";
import { commandGuard } from "../../src/catalog/blocks/command-guard.js";

describe("commandGuard block", () => {
  it("has correct metadata", () => {
    expect(commandGuard.id).toBe("command-guard");
    expect(commandGuard.event).toBe("PreToolUse");
    expect(commandGuard.matcher).toBe("Bash");
    expect(commandGuard.canBlock).toBe(true);
  });

  it("template uses grep -- to support patterns starting with dashes", () => {
    // Without --, patterns like --no-verify are interpreted as grep options
    expect(commandGuard.template).toContain('grep -qF -- ');
  });

  it("generated script normalizes multiple spaces before pattern matching", () => {
    // Verify that the template normalizes multiple consecutive spaces
    // to prevent bypassing patterns like "rm -rf /" with "rm  -rf /"
    expect(commandGuard.template).toContain("tr -s ' '");
  });
});
