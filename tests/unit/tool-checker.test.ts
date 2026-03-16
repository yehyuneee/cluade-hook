import { describe, it, expect } from "vitest";
import { checkReferencedTools, extractToolNames } from "../../src/cli/tool-checker.js";
import type { ToolCheck } from "../../src/cli/tool-checker.js";
import type { HarnessConfig } from "../../src/core/harness-schema.js";

function makeConfig(overrides: Partial<HarnessConfig["enforcement"]> = {}): HarnessConfig {
  return {
    version: "1.0",
    project: {
      stacks: [{ name: "app", framework: "nextjs", language: "typescript" }],
    },
    rules: [],
    enforcement: {
      preCommit: [],
      blockedPaths: [],
      blockedCommands: [],
      postSave: [],
      ...overrides,
    },
    permissions: { allow: [], deny: [] },
  };
}

describe("extractToolNames", () => {
  it("extracts binary names from preCommit commands", () => {
    const config = makeConfig({ preCommit: ["npx vitest run", "npx tsc --noEmit"] });
    const names = extractToolNames(config);
    expect(names).toContainEqual(expect.objectContaining({ name: "npx", source: "pre-commit" }));
  });

  it("extracts binary names from postSave commands", () => {
    const config = makeConfig({
      postSave: [
        { pattern: "*.ts", command: "eslint --fix" },
        { pattern: "*.py", command: "ruff check --fix" },
      ],
    });
    const names = extractToolNames(config);
    expect(names).toContainEqual(expect.objectContaining({ name: "eslint", source: "post-save hook" }));
    expect(names).toContainEqual(expect.objectContaining({ name: "ruff", source: "post-save hook" }));
  });

  it("returns empty array when no commands configured", () => {
    const config = makeConfig();
    const names = extractToolNames(config);
    expect(names).toEqual([]);
  });

  it("deduplicates tool names", () => {
    const config = makeConfig({
      preCommit: ["eslint .", "eslint --fix"],
      postSave: [{ pattern: "*.ts", command: "eslint --fix" }],
    });
    const names = extractToolNames(config);
    const eslintEntries = names.filter((n) => n.name === "eslint");
    expect(eslintEntries.length).toBe(1);
  });
});

describe("checkReferencedTools", () => {
  it("checks if referenced tools exist on system", async () => {
    const config = makeConfig({
      preCommit: ["npx vitest run"],
      postSave: [{ pattern: "*.ts", command: "eslint --fix" }],
    });
    const results = await checkReferencedTools(config);
    expect(Array.isArray(results)).toBe(true);
    // npx should be installed (comes with node)
    const npx = results.find((r) => r.name === "npx");
    expect(npx).toBeDefined();
    expect(npx!.installed).toBe(true);
  });

  it("returns installCmd suggestions", async () => {
    const config = makeConfig({
      postSave: [{ pattern: "*.ts", command: "eslint --fix" }],
    });
    const results = await checkReferencedTools(config);
    for (const tool of results) {
      expect(tool.installCmd).toBeDefined();
      expect(typeof tool.installCmd).toBe("string");
    }
  });

  it("returns empty array for config with no commands", async () => {
    const config = makeConfig();
    const results = await checkReferencedTools(config);
    expect(results).toEqual([]);
  });
});
