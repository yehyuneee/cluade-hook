import { describe, it, expect } from "vitest";
import { mergedBranchGuard } from "../../src/catalog/blocks/merged-branch-guard.js";

describe("mergedBranchGuard block", () => {
  it("has correct metadata", () => {
    expect(mergedBranchGuard.id).toBe("merged-branch-guard");
    expect(mergedBranchGuard.event).toBe("PreToolUse");
    expect(mergedBranchGuard.matcher).toBe("Bash");
    expect(mergedBranchGuard.canBlock).toBe(true);
  });

  it("has git-related tags", () => {
    expect(mergedBranchGuard.tags).toContain("git");
    expect(mergedBranchGuard.tags).toContain("guard");
  });

  it("has quality category", () => {
    expect(mergedBranchGuard.category).toBe("quality");
  });

  it("template is a bash script that detects git commit", () => {
    expect(mergedBranchGuard.template).toContain("#!/bin/bash");
    expect(mergedBranchGuard.template).toContain("git commit");
  });

  it("template checks if branch is merged into main", () => {
    expect(mergedBranchGuard.template).toContain("git branch --merged");
  });

  it("template blocks commit on merged branch", () => {
    expect(mergedBranchGuard.template).toMatch(/decision.*block/);
  });

  it("template allows commit on non-merged branch", () => {
    expect(mergedBranchGuard.template).toContain("exit 0");
  });

  it("template prevents direct commit to main/master", () => {
    expect(mergedBranchGuard.template).toMatch(/main|master/);
  });

  it("has no required params", () => {
    const required = mergedBranchGuard.params.filter((p) => p.required);
    expect(required).toHaveLength(0);
  });
});
