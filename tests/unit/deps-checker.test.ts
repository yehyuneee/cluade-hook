import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkDependencies } from "../../src/cli/deps-checker.js";
import type { DepCheck } from "../../src/cli/deps-checker.js";

describe("checkDependencies", () => {
  it("returns an array of dependency checks", async () => {
    const results = await checkDependencies();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("checks for required dependencies: jq, git, node", async () => {
    const results = await checkDependencies();
    const names = results.map((r) => r.name);
    expect(names).toContain("jq");
    expect(names).toContain("git");
    expect(names).toContain("node");
  });

  it("checks for optional dependency: claude", async () => {
    const results = await checkDependencies();
    const claude = results.find((r) => r.name === "claude");
    expect(claude).toBeDefined();
    expect(claude!.required).toBe(false);
  });

  it("marks required dependencies correctly", async () => {
    const results = await checkDependencies();
    const jq = results.find((r) => r.name === "jq");
    const git = results.find((r) => r.name === "git");
    const node = results.find((r) => r.name === "node");
    expect(jq!.required).toBe(true);
    expect(git!.required).toBe(true);
    expect(node!.required).toBe(true);
  });

  it("detects installed commands (git and node should be installed)", async () => {
    const results = await checkDependencies();
    const git = results.find((r) => r.name === "git");
    const node = results.find((r) => r.name === "node");
    expect(git!.installed).toBe(true);
    expect(node!.installed).toBe(true);
  });

  it("returns version strings for installed commands", async () => {
    const results = await checkDependencies();
    const git = results.find((r) => r.name === "git");
    const node = results.find((r) => r.name === "node");
    expect(git!.version).toBeDefined();
    expect(git!.version!.length).toBeGreaterThan(0);
    expect(node!.version).toBeDefined();
    expect(node!.version!.length).toBeGreaterThan(0);
  });

  it("includes purpose and installHint for each dependency", async () => {
    const results = await checkDependencies();
    for (const dep of results) {
      expect(dep.purpose).toBeDefined();
      expect(dep.purpose.length).toBeGreaterThan(0);
      expect(dep.installHint).toBeDefined();
      expect(dep.installHint.length).toBeGreaterThan(0);
    }
  });

  it("includes command field for each dependency", async () => {
    const results = await checkDependencies();
    for (const dep of results) {
      expect(dep.command).toBeDefined();
      expect(dep.command.length).toBeGreaterThan(0);
    }
  });
});
