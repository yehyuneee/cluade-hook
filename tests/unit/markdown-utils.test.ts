import { describe, it, expect } from "vitest";
import {
  extractManagedSections,
  upsertManagedSection,
  removeManagedSection,
  hasManagedSection,
} from "../../src/utils/markdown.js";

describe("markdown utils", () => {
  describe("extractManagedSections", () => {
    it("extracts sections from markdown", () => {
      const md = `# My Doc

<!-- oh-my-harness:start:rules -->
## Rules
- Rule 1
<!-- oh-my-harness:end:rules -->

Some user content

<!-- oh-my-harness:start:hooks -->
## Hooks
- Hook 1
<!-- oh-my-harness:end:hooks -->
`;
      const sections = extractManagedSections(md);
      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe("rules");
      expect(sections[0].content).toContain("Rule 1");
      expect(sections[1].id).toBe("hooks");
    });

    it("returns empty array when no sections exist", () => {
      expect(extractManagedSections("# Just a doc\nNo markers here")).toEqual([]);
    });
  });

  describe("upsertManagedSection", () => {
    it("appends section to empty document", () => {
      const result = upsertManagedSection("", "test", "## Test\n- Item");
      expect(result).toContain("<!-- oh-my-harness:start:test -->");
      expect(result).toContain("## Test\n- Item");
      expect(result).toContain("<!-- oh-my-harness:end:test -->");
    });

    it("appends section to existing document", () => {
      const result = upsertManagedSection("# My Doc\n\nContent here", "test", "## Test");
      expect(result).toContain("# My Doc");
      expect(result).toContain("Content here");
      expect(result).toContain("<!-- oh-my-harness:start:test -->");
    });

    it("replaces existing section (idempotent)", () => {
      const existing = `# Doc

<!-- oh-my-harness:start:rules -->
## Old Rules
- Old rule
<!-- oh-my-harness:end:rules -->

User content`;

      const result = upsertManagedSection(existing, "rules", "## New Rules\n- New rule");
      expect(result).toContain("## New Rules");
      expect(result).not.toContain("Old Rules");
      expect(result).toContain("User content"); // preserved
    });

    it("is idempotent — double upsert produces same result", () => {
      const content = "## Rules\n- Rule 1";
      const first = upsertManagedSection("", "rules", content);
      const second = upsertManagedSection(first, "rules", content);
      expect(first).toBe(second);
    });
  });

  describe("removeManagedSection", () => {
    it("removes a section by id", () => {
      const md = `# Doc

<!-- oh-my-harness:start:rules -->
## Rules
<!-- oh-my-harness:end:rules -->

Keep this`;

      const result = removeManagedSection(md, "rules");
      expect(result).not.toContain("oh-my-harness:start:rules");
      expect(result).toContain("Keep this");
    });

    it("does nothing when section does not exist", () => {
      const md = "# Doc\nContent";
      expect(removeManagedSection(md, "nonexistent")).toContain("Content");
    });
  });

  describe("hasManagedSection", () => {
    it("returns true when section exists", () => {
      const md = `<!-- oh-my-harness:start:test -->\ncontent\n<!-- oh-my-harness:end:test -->`;
      expect(hasManagedSection(md, "test")).toBe(true);
    });

    it("returns false when section does not exist", () => {
      expect(hasManagedSection("# Doc", "test")).toBe(false);
    });
  });
});
