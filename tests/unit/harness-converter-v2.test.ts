import { describe, it, expect } from "vitest";
import { harnessToMergedConfigV2 } from "../../src/core/harness-converter-v2.js";
import { CatalogRegistry } from "../../src/catalog/registry.js";
import type { HarnessConfig } from "../../src/core/harness-schema.js";
import type { BuildingBlock } from "../../src/catalog/types.js";

function makeBlock(overrides: Partial<BuildingBlock> = {}): BuildingBlock {
  return {
    id: "test-block",
    name: "Test Block",
    description: "A test block",
    category: "git",
    event: "PreToolUse",
    matcher: "Bash",
    canBlock: false,
    params: [],
    template: "#!/bin/bash\necho done",
    tags: [],
    ...overrides,
  };
}

const baseHarness: HarnessConfig = {
  version: "1.0",
  project: {
    name: "test-app",
    description: "A test app",
    stacks: [
      {
        name: "frontend",
        framework: "nextjs",
        language: "typescript",
        packageManager: "pnpm",
        testRunner: "vitest",
        linter: "eslint",
      },
    ],
  },
  rules: [
    {
      id: "rule-1",
      title: "App Router",
      content: "## App Router\n\n- Use App Router always",
      priority: 20,
    },
  ],
  enforcement: {
    preCommit: ["test", "lint"],
    blockedPaths: [],
    blockedCommands: [],
    postSave: [],
  },
  permissions: {
    allow: ["Bash(pnpm test*)"],
    deny: [],
  },
  hooks: [],
};

describe("harnessToMergedConfigV2", () => {
  it("converts v1 enforcement-only config (backward compat)", async () => {
    const registry = new CatalogRegistry();
    const result = await harnessToMergedConfigV2(baseHarness, registry);

    expect(result.presets).toEqual(["harness"]);
    expect(result.claudeMdSections).toHaveLength(1);
    expect(result.hooks).toBeDefined();
    // v1 preCommit hook should still be present
    const preCommitHook = result.hooks.preToolUse.find((h) => h.id === "harness-pre-commit");
    expect(preCommitHook).toBeDefined();
  });

  it("converts v2 hooks-only config", async () => {
    const registry = new CatalogRegistry();
    registry.register(
      makeBlock({
        id: "my-block",
        event: "PreToolUse",
        matcher: "Bash",
        template: "#!/bin/bash\necho hi",
      }),
    );

    const hooksOnly: HarnessConfig = {
      version: "1.0",
      project: { stacks: [{ name: "app", framework: "express", language: "javascript" }] },
      rules: [],
      enforcement: { preCommit: [], blockedPaths: [], blockedCommands: [], postSave: [] },
      permissions: { allow: [], deny: [] },
      hooks: [{ block: "my-block", params: {} }],
    };

    const result = await harnessToMergedConfigV2(hooksOnly, registry);

    expect(result.errors).toBeUndefined();
    // catalog hook should produce a preToolUse hook
    const catalogHook = result.hooks.preToolUse.find((h) => h.id === "catalog-my-block");
    expect(catalogHook).toBeDefined();
    expect(catalogHook!.matcher).toBe("Bash");
  });

  it("converts mixed v1+v2 config and merges hooks", async () => {
    const registry = new CatalogRegistry();
    registry.register(
      makeBlock({
        id: "post-block",
        event: "PostToolUse",
        matcher: "Edit",
        template: "#!/bin/bash\necho post",
      }),
    );

    const mixed: HarnessConfig = {
      ...baseHarness,
      enforcement: {
        preCommit: ["test"],
        blockedPaths: [],
        blockedCommands: [],
        postSave: [],
      },
      hooks: [{ block: "post-block", params: {} }],
    };

    const result = await harnessToMergedConfigV2(mixed, registry);

    // v1 hook from enforcement
    const preCommitHook = result.hooks.preToolUse.find((h) => h.id === "harness-pre-commit");
    expect(preCommitHook).toBeDefined();

    // v2 catalog hook
    const catalogHook = result.hooks.postToolUse.find((h) => h.id === "catalog-post-block");
    expect(catalogHook).toBeDefined();
  });

  it("returns catalogErrors when unknown block id is used", async () => {
    const registry = new CatalogRegistry();

    const config: HarnessConfig = {
      ...baseHarness,
      hooks: [{ block: "does-not-exist", params: {} }],
    };

    const result = await harnessToMergedConfigV2(config, registry);

    expect(result.catalogErrors).toBeDefined();
    expect(result.catalogErrors!.length).toBeGreaterThan(0);
    expect(result.catalogErrors![0]).toContain("does-not-exist");
  });

  it("returns catalogErrors when missing required params", async () => {
    const registry = new CatalogRegistry();
    registry.register(
      makeBlock({
        id: "parameterized-block",
        params: [{ name: "cmd", type: "string", description: "command", required: true }],
        template: "#!/bin/bash\n{{cmd}}",
      }),
    );

    const config: HarnessConfig = {
      ...baseHarness,
      hooks: [{ block: "parameterized-block", params: {} }],
    };

    const result = await harnessToMergedConfigV2(config, registry);

    expect(result.catalogErrors).toBeDefined();
    expect(result.catalogErrors!.length).toBeGreaterThan(0);
    expect(result.catalogErrors![0]).toContain("cmd");
  });

  it("v2 catalog hooks take precedence over v1 hooks for same event", async () => {
    const registry = new CatalogRegistry();
    registry.register(
      makeBlock({
        id: "pre-block",
        event: "PreToolUse",
        matcher: "Bash",
        template: "#!/bin/bash\necho catalog",
      }),
    );

    const config: HarnessConfig = {
      ...baseHarness,
      enforcement: {
        preCommit: ["test"],
        blockedPaths: [],
        blockedCommands: [],
        postSave: [],
      },
      hooks: [{ block: "pre-block", params: {} }],
    };

    const result = await harnessToMergedConfigV2(config, registry);

    // Both v1 and v2 hooks are present (merged)
    expect(result.hooks.preToolUse.length).toBeGreaterThanOrEqual(2);

    // Verify catalog hook comes after v1 hooks (catalog takes precedence via ordering)
    const hookIds = result.hooks.preToolUse.map((h) => h.id);
    const v1Index = hookIds.indexOf("harness-pre-commit");
    const catalogIndex = hookIds.indexOf("catalog-pre-block");
    expect(v1Index).toBeGreaterThanOrEqual(0);
    expect(catalogIndex).toBeGreaterThanOrEqual(0);
    // catalog hooks are appended after v1 hooks
    expect(catalogIndex).toBeGreaterThan(v1Index);
  });

  it("empty hooks array produces no catalog errors", async () => {
    const registry = new CatalogRegistry();

    const config: HarnessConfig = {
      ...baseHarness,
      hooks: [],
    };

    const result = await harnessToMergedConfigV2(config, registry);

    expect(result.catalogErrors).toBeUndefined();
  });
});
