import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HarnessConfig } from "../core/harness-schema.js";

const execFileAsync = promisify(execFile);

export interface ToolCheck {
  name: string;
  command: string;
  source: string;
  installCmd: string;
  installed: boolean;
}

interface ToolRef {
  name: string;
  source: string;
}

const INSTALL_HINTS: Record<string, string> = {
  eslint: "npm install -D eslint",
  prettier: "npm install -D prettier",
  ruff: "pip install ruff",
  black: "pip install black",
  mypy: "pip install mypy",
  pytest: "pip install pytest",
  vitest: "npm install -D vitest",
  tsc: "npm install -D typescript",
  npx: "npm install -g npx",
  biome: "npm install -D @biomejs/biome",
};

function extractBinary(command: string): string | undefined {
  const trimmed = command.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/)[0];
}

export function extractToolNames(config: HarnessConfig): ToolRef[] {
  const seen = new Set<string>();
  const tools: ToolRef[] = [];

  for (const cmd of config.enforcement.preCommit) {
    const name = extractBinary(cmd);
    if (!name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      tools.push({ name, source: "pre-commit" });
    }
  }

  for (const ps of config.enforcement.postSave) {
    const name = extractBinary(ps.command);
    if (!name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      tools.push({ name, source: "post-save hook" });
    }
  }

  return tools;
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("which", [command]);
    return true;
  } catch {
    return false;
  }
}

function getInstallCmd(name: string): string {
  return INSTALL_HINTS[name] ?? `npm install -D ${name}`;
}

export async function checkReferencedTools(config: HarnessConfig): Promise<ToolCheck[]> {
  const refs = extractToolNames(config);
  const results: ToolCheck[] = [];

  for (const ref of refs) {
    const installed = await commandExists(ref.name);
    results.push({
      name: ref.name,
      command: ref.name,
      source: ref.source,
      installCmd: getInstallCmd(ref.name),
      installed,
    });
  }

  return results;
}
