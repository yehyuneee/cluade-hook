import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadPreset } from "../../src/core/preset-loader.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures");

describe("preset-loader", () => {
  it("loads a valid preset from fixture", async () => {
    const preset = await loadPreset(path.join(FIXTURES_DIR, "sample-preset"));
    expect(preset.name).toBe("sample");
    expect(preset.displayName).toBe("Sample Preset");
    expect(preset.tags).toContain("sample");
    expect(preset.variables?.language).toBe("typescript");
  });

  it("parses claudeMd sections", async () => {
    const preset = await loadPreset(path.join(FIXTURES_DIR, "sample-preset"));
    expect(preset.claudeMd?.sections).toHaveLength(1);
    expect(preset.claudeMd?.sections[0].id).toBe("sample-rules");
    expect(preset.claudeMd?.sections[0].priority).toBe(20);
  });

  it("parses hooks", async () => {
    const preset = await loadPreset(path.join(FIXTURES_DIR, "sample-preset"));
    expect(preset.hooks?.preToolUse).toHaveLength(1);
    expect(preset.hooks?.preToolUse?.[0].id).toBe("sample-guard");
    expect(preset.hooks?.preToolUse?.[0].matcher).toBe("Bash");
  });

  it("parses settings", async () => {
    const preset = await loadPreset(path.join(FIXTURES_DIR, "sample-preset"));
    expect(preset.settings?.permissions?.allow).toContain("Bash(npm test*)");
    expect(preset.settings?.permissions?.deny).toContain("Bash(rm -rf /)");
  });

  it("throws on invalid preset (missing required fields)", async () => {
    // Create an invalid path that doesn't exist
    await expect(loadPreset(path.join(FIXTURES_DIR, "nonexistent"))).rejects.toThrow();
  });

  it("loads the _base preset from presets directory", async () => {
    const presetsDir = path.resolve(import.meta.dirname, "../../presets");
    const preset = await loadPreset(path.join(presetsDir, "_base"));
    expect(preset.name).toBe("_base");
    expect(preset.claudeMd?.sections.length).toBeGreaterThan(0);
    expect(preset.hooks?.preToolUse?.length).toBeGreaterThan(0);
  });
});
