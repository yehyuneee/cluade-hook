import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CatalogRegistry } from "../../src/catalog/registry.js";
import type { BuildingBlock } from "../../src/catalog/types.js";

// Mock createDefaultRegistry
vi.mock("../../src/catalog/registry.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/catalog/registry.js")>();
  return {
    ...actual,
    createDefaultRegistry: vi.fn(),
  };
});

function makeBlock(overrides: Partial<BuildingBlock> = {}): BuildingBlock {
  return {
    id: "test-block",
    name: "Test Block",
    description: "A test building block",
    category: "git",
    event: "PreToolUse",
    matcher: "Bash",
    canBlock: false,
    params: [],
    template: "echo hello",
    tags: ["test"],
    ...overrides,
  };
}

describe("catalogListCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints all blocks grouped by category", async () => {
    const registry = new CatalogRegistry();
    registry.register(makeBlock({ id: "branch-guard", name: "Branch Guard", category: "git", description: "Blocks commits on merged branches", event: "PreToolUse", matcher: "Bash" }));
    registry.register(makeBlock({ id: "commit-test-gate", name: "Commit Test Gate", category: "quality", description: "Runs tests before commit", event: "PreToolUse", matcher: "Bash" }));

    const { createDefaultRegistry } = await import("../../src/catalog/registry.js");
    vi.mocked(createDefaultRegistry).mockResolvedValue(registry);

    const { catalogListCommand } = await import("../../src/cli/commands/catalog.js");
    await catalogListCommand();

    const output = consoleLogSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("branch-guard");
    expect(output).toContain("Branch Guard");
    expect(output).toContain("commit-test-gate");
    expect(output).toContain("Git");
    expect(output).toContain("Quality");
  });

  it("shows category emoji for known categories", async () => {
    const registry = new CatalogRegistry();
    registry.register(makeBlock({ id: "block-a", category: "git" }));

    const { createDefaultRegistry } = await import("../../src/catalog/registry.js");
    vi.mocked(createDefaultRegistry).mockResolvedValue(registry);

    const { catalogListCommand } = await import("../../src/cli/commands/catalog.js");
    await catalogListCommand();

    const output = consoleLogSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("🔀");
  });

  it("displays event and matcher in output", async () => {
    const registry = new CatalogRegistry();
    registry.register(makeBlock({ id: "my-block", event: "PreToolUse", matcher: "Bash" }));

    const { createDefaultRegistry } = await import("../../src/catalog/registry.js");
    vi.mocked(createDefaultRegistry).mockResolvedValue(registry);

    const { catalogListCommand } = await import("../../src/cli/commands/catalog.js");
    await catalogListCommand();

    const output = consoleLogSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("PreToolUse");
    expect(output).toContain("Bash");
  });
});

describe("catalogInfoCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows full block details for a known block", async () => {
    const registry = new CatalogRegistry();
    registry.register(
      makeBlock({
        id: "branch-guard",
        name: "Branch Guard",
        description: "Blocks commits on merged branches",
        category: "git",
        event: "PreToolUse",
        matcher: "Bash",
        tags: ["git", "safety"],
        params: [
          {
            name: "allowedBranches",
            type: "string[]",
            description: "Branches to allow",
            required: false,
            default: ["main"],
          },
        ],
      }),
    );

    const { createDefaultRegistry } = await import("../../src/catalog/registry.js");
    vi.mocked(createDefaultRegistry).mockResolvedValue(registry);

    const { catalogInfoCommand } = await import("../../src/cli/commands/catalog.js");
    await catalogInfoCommand("branch-guard");

    const output = consoleLogSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Branch Guard");
    expect(output).toContain("Blocks commits on merged branches");
    expect(output).toContain("PreToolUse");
    expect(output).toContain("Bash");
    expect(output).toContain("allowedBranches");
    expect(output).toContain("git");
    expect(output).toContain("safety");
  });

  it("shows error for unknown block id", async () => {
    const registry = new CatalogRegistry();

    const { createDefaultRegistry } = await import("../../src/catalog/registry.js");
    vi.mocked(createDefaultRegistry).mockResolvedValue(registry);

    const { catalogInfoCommand } = await import("../../src/cli/commands/catalog.js");
    await catalogInfoCommand("nonexistent-block");

    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errorOutput).toContain("nonexistent-block");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
