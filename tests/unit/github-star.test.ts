import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  hasStarPromptBeenShown,
  markStarPromptShown,
} from "../../src/cli/github-star.js";

describe("github-star state persistence", () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "omh-star-"));
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("hasStarPromptBeenShown returns false when no state file", async () => {
    expect(await hasStarPromptBeenShown()).toBe(false);
  });

  it("hasStarPromptBeenShown returns true after markStarPromptShown", async () => {
    await markStarPromptShown();
    expect(await hasStarPromptBeenShown()).toBe(true);
  });

  it("markStarPromptShown creates state file in ~/.omh/", async () => {
    await markStarPromptShown();
    const raw = await readFile(join(tmpDir, ".omh", "star-prompt.json"), "utf-8");
    const state = JSON.parse(raw);
    expect(state.prompted).toBe(true);
  });
});
