import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { PresetRegistry } from "../../src/core/preset-registry.js";

const PRESETS_DIR = path.resolve(import.meta.dirname, "../../presets");

describe("preset-registry", () => {
  let registry: PresetRegistry;

  beforeEach(async () => {
    registry = new PresetRegistry();
    await registry.discover(PRESETS_DIR);
  });

  it("discovers presets from directory", () => {
    const presets = registry.list();
    expect(presets.length).toBeGreaterThan(0);
  });

  it("finds _base preset", () => {
    expect(registry.has("_base")).toBe(true);
    const base = registry.get("_base");
    expect(base?.config.name).toBe("_base");
  });

  it("returns undefined for unknown preset", () => {
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("has() returns false for unknown preset", () => {
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("searches by tag", () => {
    const results = registry.search(["base"]);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].config.name).toBe("_base");
  });

  it("search is case insensitive", () => {
    const results = registry.search(["BASE"]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("search matches preset name as well", () => {
    const results = registry.search(["_base"]);
    expect(results.length).toBeGreaterThan(0);
  });
});
