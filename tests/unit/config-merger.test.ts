import { describe, it, expect } from "vitest";
import { mergePresets } from "../../src/core/config-merger.js";
import type { PresetConfig } from "../../src/core/preset-types.js";

const basePreset: PresetConfig = {
  name: "_base",
  displayName: "Base",
  description: "Base preset",
  version: "1.0.0",
  tags: ["base"],
  variables: { language: "typescript" },
  claudeMd: {
    sections: [
      { id: "general-rules", title: "General Rules", content: "## General\n- Rule 1", priority: 10 },
      { id: "tdd-rules", title: "TDD", content: "## TDD\n- Write tests first", priority: 11 },
    ],
  },
  hooks: {
    preToolUse: [
      { id: "command-guard", matcher: "Bash", inline: "#!/bin/bash\nexit 0" },
    ],
  },
  settings: {
    permissions: {
      deny: ["Bash(rm -rf /)"],
    },
  },
};

const nextjsPreset: PresetConfig = {
  name: "nextjs",
  displayName: "Next.js",
  description: "Next.js preset",
  version: "1.0.0",
  extends: ["_base"],
  tags: ["nextjs", "react"],
  variables: { framework: "nextjs", testRunner: "vitest" },
  claudeMd: {
    sections: [
      { id: "nextjs-rules", title: "Next.js Rules", content: "## Next.js\n- Use App Router", priority: 20 },
    ],
  },
  hooks: {
    preToolUse: [
      { id: "file-guard", matcher: "Edit|Write", inline: "#!/bin/bash\nexit 0" },
    ],
    postToolUse: [
      { id: "lint-on-save", matcher: "Edit|Write", inline: "#!/bin/bash\nexit 0" },
    ],
  },
  settings: {
    permissions: {
      allow: ["Bash(pnpm test*)"],
      deny: ["Bash(sudo *)"],
    },
  },
};

describe("config-merger", () => {
  it("merges single preset", () => {
    const merged = mergePresets([basePreset]);
    expect(merged.presets).toEqual(["_base"]);
    expect(merged.variables.language).toBe("typescript");
    expect(merged.claudeMdSections).toHaveLength(2);
  });

  it("merges multiple presets", () => {
    const merged = mergePresets([basePreset, nextjsPreset]);
    expect(merged.presets).toEqual(["_base", "nextjs"]);
  });

  it("later preset variables override earlier", () => {
    const merged = mergePresets([basePreset, nextjsPreset]);
    expect(merged.variables.framework).toBe("nextjs");
    expect(merged.variables.language).toBe("typescript"); // base preserved
  });

  it("sorts claudeMd sections by priority", () => {
    const merged = mergePresets([basePreset, nextjsPreset]);
    const priorities = merged.claudeMdSections.map((s) => s.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => (a ?? 50) - (b ?? 50)));
    expect(merged.claudeMdSections[0].id).toBe("general-rules"); // priority 10
  });

  it("deduplicates hooks by id (later wins)", () => {
    const override: PresetConfig = {
      ...basePreset,
      name: "override",
      hooks: {
        preToolUse: [
          { id: "command-guard", matcher: "Bash", inline: "#!/bin/bash\necho overridden\nexit 0" },
        ],
      },
    };
    const merged = mergePresets([basePreset, override]);
    const guard = merged.hooks.preToolUse.find((h) => h.id === "command-guard");
    expect(guard?.inline).toContain("overridden");
  });

  it("accumulates hooks from different presets", () => {
    const merged = mergePresets([basePreset, nextjsPreset]);
    expect(merged.hooks.preToolUse).toHaveLength(2); // command-guard + file-guard
    expect(merged.hooks.postToolUse).toHaveLength(1); // lint-on-save
  });

  it("accumulates settings permissions", () => {
    const merged = mergePresets([basePreset, nextjsPreset]);
    expect(merged.settings.permissions.deny).toContain("Bash(rm -rf /)");
    expect(merged.settings.permissions.deny).toContain("Bash(sudo *)");
    expect(merged.settings.permissions.allow).toContain("Bash(pnpm test*)");
  });

  it("handles empty presets gracefully", () => {
    const empty: PresetConfig = {
      name: "empty",
      displayName: "Empty",
      description: "Empty",
      version: "1.0.0",
    };
    const merged = mergePresets([empty]);
    expect(merged.claudeMdSections).toEqual([]);
    expect(merged.hooks.preToolUse).toEqual([]);
    expect(merged.hooks.postToolUse).toEqual([]);
  });
});
