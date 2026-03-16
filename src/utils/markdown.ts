const MARKER_START = (id: string) => `<!-- oh-my-harness:start:${id} -->`;
const MARKER_END = (id: string) => `<!-- oh-my-harness:end:${id} -->`;

export interface ManagedSection {
  id: string;
  content: string;
}

export function extractManagedSections(markdown: string): ManagedSection[] {
  const sections: ManagedSection[] = [];
  const regex = /<!-- oh-my-harness:start:(\S+) -->\n([\s\S]*?)<!-- oh-my-harness:end:\1 -->/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    sections.push({ id: match[1], content: match[2] });
  }
  return sections;
}

export function upsertManagedSection(markdown: string, id: string, newContent: string): string {
  const startMarker = MARKER_START(id);
  const endMarker = MARKER_END(id);
  const wrappedContent = `${startMarker}\n${newContent}\n${endMarker}`;

  const regex = new RegExp(
    `<!-- oh-my-harness:start:${escapeRegex(id)} -->\\n[\\s\\S]*?<!-- oh-my-harness:end:${escapeRegex(id)} -->`,
  );

  if (regex.test(markdown)) {
    return markdown.replace(regex, wrappedContent);
  }

  const separator = markdown.length > 0 && !markdown.endsWith("\n\n") ? "\n\n" : "";
  return markdown + separator + wrappedContent + "\n";
}

export function removeManagedSection(markdown: string, id: string): string {
  const regex = new RegExp(
    `\\n?<!-- oh-my-harness:start:${escapeRegex(id)} -->\\n[\\s\\S]*?<!-- oh-my-harness:end:${escapeRegex(id)} -->\\n?`,
  );
  return markdown.replace(regex, "\n").replace(/\n{3,}/g, "\n\n");
}

export function hasManagedSection(markdown: string, id: string): boolean {
  return markdown.includes(MARKER_START(id)) && markdown.includes(MARKER_END(id));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
